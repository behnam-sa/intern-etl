import {
    DatasetInputNode,
    DatasetOutputNode,
    importPipelineNode,
    PipelineNodeType,
} from './pipeline-node.model';
import { Pipeline } from './pipeline.model';

export interface PipelineExport {
    pipelineId?: number;
    pipelineName: string;
    inputDatasetId: number | null;
    inputDataset: string | null;
    outputDatasetId: number | null;
    outputDataset: string | null;
    overwrite: boolean;
    processes: {
        nodeId: number;
        name: string;
        type: PipelineNodeType;
        inputs: string;
        position: string;
        instruction: string;
    }[];
}

export function exportPipeline(pipeline: Pipeline): PipelineExport {
    const inputDatasetNodes = pipeline.nodes.filter(
        (node) => node.type === PipelineNodeType.datasetInput
    );
    if (inputDatasetNodes.length > 1)
        throw new Error('حداکثر یک گره دیتاست ورودی پشتیباتی می‌شود');

    const outputDatasetNodes = pipeline.nodes.filter(
        (node) => node.type === PipelineNodeType.datasetOutput
    );
    if (inputDatasetNodes.length > 1)
        throw new Error('حداکثر یک گره دیتاست خروجی پشتیباتی می‌شود');

    const inputDataset = inputDatasetNodes[0] as DatasetInputNode | undefined;
    const outputDataset = outputDatasetNodes[0] as
        | DatasetOutputNode
        | undefined;

    return {
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        inputDatasetId: inputDataset?.config.datasetId || 0,
        inputDataset: inputDataset
            ? JSON.stringify(inputDataset.export())
            : null,
        outputDatasetId: outputDataset?.config.datasetId || 0,
        outputDataset: outputDataset
            ? JSON.stringify(outputDataset.export())
            : null,
        overwrite: outputDataset?.config.overwrite || false,
        processes: pipeline.nodes
            .filter(
                (node) =>
                    node.type !== PipelineNodeType.datasetInput &&
                    node.type !== PipelineNodeType.datasetOutput
            )
            .map((node) => node.export()),
    };
}

export function importPipeline(exported: PipelineExport) {
    const pipeline = new Pipeline(exported.pipelineId, exported.pipelineName);

    if (exported.inputDataset !== null) {
        const inputDatasetExport = JSON.parse(exported.inputDataset);
        pipeline.addNode(importPipelineNode(inputDatasetExport));
    }

    for (const node of exported.processes)
        pipeline.addNode(importPipelineNode(node));

    if (exported.outputDataset !== null) {
        const outputDatasetExport = JSON.parse(exported.outputDataset);
        pipeline.addNode(importPipelineNode(outputDatasetExport));
    }

    return pipeline;
}
