import {
    CdkDrag,
    CdkDragDrop,
    CdkDragEnd,
    CdkDragMove,
    CdkDragStart,
    CdkDropList,
} from '@angular/cdk/drag-drop';
import {
    AfterViewChecked,
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import {
    PipelineNode,
    PipelineNodeInfo,
    pipelineNodeInfo,
    PipelineNodeType,
} from '../../models/pipeline-node.model';
import { Pipeline } from '../../models/pipeline.model';
import { hasError } from '../../models/validation.model';
import { LineService } from '../../services/line.service';

const REM_IN_PIXLES = parseFloat(
    getComputedStyle(document.documentElement).fontSize
);
const GRID_IN_PIXELS = 4 * REM_IN_PIXLES;

class Card {
    constructor(public node: PipelineNode) {
        this.inputs = Array(node.inputs.length).fill(null);
        this.hasOutput = this.typeInfo.hasOutput;
        this.updatePosition();
    }

    inputs: (Card | null)[];
    hasOutput: boolean;
    position!: { x: number; y: number };
    outputPlaceholderElement?: HTMLElement;

    get title() {
        return this.node.name;
    }

    get subtitle() {
        return pipelineNodeInfo[this.node.type].title;
    }

    get typeInfo() {
        return pipelineNodeInfo[this.node.type];
    }

    updatePosition() {
        this.position = {
            x: -this.node.position.x * GRID_IN_PIXELS,
            y: this.node.position.y * GRID_IN_PIXELS,
        };
    }
}

interface DropListData {
    type: 'input' | 'output' | 'remove';
    card?: Card;
    index?: number;
}

@Component({
    selector: 'app-diagram',
    templateUrl: './diagram.component.html',
    styleUrls: ['./diagram.component.scss'],
})
export class DiagramComponent
    implements OnInit, OnChanges, AfterViewInit, AfterViewChecked
{
    @Input() pipeline!: Pipeline;
    @Output('selectedNode') selectedNodeEvent =
        new EventEmitter<PipelineNode>();
    @ViewChild('lineContainer') lineContainer?: ElementRef<HTMLElement>;
    @ViewChild('cardContainer') cardContainer?: ElementRef<HTMLElement>;

    baseOffset = { x: 0, y: 0 };
    dragOffset = { x: 0, y: 0 };
    cards: Card[] = [];
    reposition = new Subject<void>();
    selectedCard?: Card;
    shouldReposition = false;
    subscriptions: Subscription[] = [];

    Card = Card;
    addNodeTypes = Object.values(pipelineNodeInfo).filter(
        (info) =>
            info.type !== PipelineNodeType.datasetInput &&
            info.type !== PipelineNodeType.datasetOutput
    );
    PipelineNodeType = PipelineNodeType;
    hasError = hasError;

    constructor() {}

    ngOnInit(): void {}

    ngOnChanges(changes: SimpleChanges): void {
        if (
            changes.pipeline !== undefined &&
            changes.pipeline.previousValue !== changes.pipeline.currentValue
        ) {
            // remove last
            if (changes.pipeline.previousValue) {
                this.subscriptions.forEach((sub) => sub.unsubscribe());
                this.subscriptions.splice(0);
                this.shouldReposition = false;
                this.updateSelectedCard(undefined);
                this.cards.splice(0);
                this.baseOffset = { x: 0, y: 0 };
                this.dragOffset = { x: 0, y: 0 };
            }

            this.initPipeline();
        }
    }

    ngAfterViewInit() {
        window.addEventListener('load', () => {
            this.reposition.next();
        });
    }

    ngAfterViewChecked(): void {
        //if (this.shouldReposition) {
        this.reposition.next();
        this.shouldReposition = false;
        //}
    }

    updateSelectedCard(card?: Card) {
        this.selectedCard = card;
        this.selectedNodeEvent.emit(card?.node);
    }

    initPipeline() {
        this.pipeline.nodes.forEach((node) => {
            this.cards.push(new Card(node));
        });

        this.pipeline.nodes.forEach((node) => {
            this.updateCardInputs(node);
        });

        this.subscriptions.push(
            this.pipeline.nodeAdded.subscribe((node) => {
                this.cards.push(new Card(node));
                this.updateCardInputs(node);
            })
        );

        this.subscriptions.push(
            this.pipeline.nodeEdited.subscribe((node) => {
                this.updateCardInputs(node);
            })
        );

        this.subscriptions.push(
            this.pipeline.nodeRemoved.subscribe((node) => {
                const index = this.cards.findIndex(
                    (card) => card.node.id === node.id
                )!;
                this.cards.splice(index, 1);
            })
        );

        this.subscriptions.push(
            this.pipeline.loaded.subscribe(() => {
                this.autoView();
            })
        );
    }

    autoView() {
        if (this.pipeline.nodes.length > 0) {
            const offset = this.pipeline.nodes.reduce(
                (min, node) => ({
                    x: Math.min(min.x, node.position.x),
                    y: Math.min(min.y, node.position.y),
                }),
                { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY }
            );

            this.baseOffset = {
                x: (offset.x - 2) * GRID_IN_PIXELS,
                y: -(offset.y - 2) * GRID_IN_PIXELS,
            };
        }
    }

    updateCardInputs(node: PipelineNode) {
        const card = this.findCard(node.id)!;
        for (let i = 0; i < card.inputs.length; i++) {
            if (node.inputs[i] === null) card.inputs[i] = null;
            else card.inputs[i] = this.findCard(node.inputs[i]!)!;
        }
    }

    findCard(id: number) {
        return this.cards.find((card) => card.node.id === id);
    }

    inputDropEnterPredicate(drag: CdkDrag, drop: CdkDropList<DropListData>) {
        return (drag.data as Card) !== drop.data.card!;
    }

    buttonDrop(event: CdkDragDrop<DropListData>) {
        if (event.previousContainer === event.container) return;

        const previous = event.previousContainer.data;
        const current = event.container.data;

        if (current.type === 'output' || current.type === 'remove') {
            if (previous.type === 'input') {
                previous.card!.node.inputs[previous.index!] = null;
                this.pipeline.markNodeAsEdited(previous.card!.node.id);
            }
        } else if (current.type === 'input') {
            if (previous.type === 'input') {
                current.card!.node.inputs[current.index!] =
                    previous.card!.node.inputs[previous.index!];
                previous.card!.node.inputs[previous.index!] = null;
                this.pipeline.markNodeAsEdited(previous.card!.node.id);
                this.pipeline.markNodeAsEdited(current.card!.node.id);
            } else if (previous.type === 'output') {
                current.card!.node.inputs[current.index!] =
                    previous.card!.node.id;
                this.pipeline.markNodeAsEdited(current.card!.node.id);
            }
        }
    }

    updateDragOffset(event: CdkDragMove) {
        this.dragOffset = event.distance;
    }

    updateOffset(event: CdkDragEnd) {
        this.baseOffset = {
            x: this.baseOffset.x + event.distance.x,
            y: this.baseOffset.y + event.distance.y,
        };
        this.dragOffset = { x: 0, y: 0 };
        event.source.reset();
    }

    cardDragStarted(event: CdkDragStart<Card>) {
        event.source.element.nativeElement.classList.remove('snap-animation');
    }

    cardDragEnded(event: CdkDragEnd<Card>) {
        event.source.element.nativeElement.classList.add('snap-animation');
        event.source.data.node.position = {
            x: Math.round(
                -event.source.getFreeDragPosition().x / GRID_IN_PIXELS
            ),
            y: Math.round(
                event.source.getFreeDragPosition().y / GRID_IN_PIXELS
            ),
        };
        event.source.data.updatePosition();
    }

    addNode(event: CdkDragEnd<PipelineNodeInfo>) {
        const rect = this.cardContainer!.nativeElement.getBoundingClientRect();
        if (
            event.dropPoint.x < rect.left ||
            event.dropPoint.x > rect.right ||
            event.dropPoint.y < rect.top ||
            event.dropPoint.y > rect.bottom
        )
            return;

        const dropPoint = {
            x:
                rect.right -
                event.dropPoint.x -
                2.5 * GRID_IN_PIXELS +
                this.baseOffset.x,
            y:
                event.dropPoint.y -
                rect.top -
                GRID_IN_PIXELS -
                this.baseOffset.y,
        };
        const position = {
            x: Math.round(dropPoint.x / GRID_IN_PIXELS),
            y: Math.round(dropPoint.y / GRID_IN_PIXELS),
        };

        this.pipeline.createNode(
            event.source.data.title,
            event.source.data.type,
            position
        );
    }

    removeNode(id: number) {
        this.pipeline.removeNode(id);
        if (this.selectedCard?.node?.id === id)
            this.updateSelectedCard(undefined);
    }
}
