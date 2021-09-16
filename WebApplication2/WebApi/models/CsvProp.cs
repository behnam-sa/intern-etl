﻿using System.ComponentModel.DataAnnotations;

namespace WebApi.models
{
    public class CsvProp
    { 
        public string CsvContent { set; get; }
        [Required] public string DatasetName { set; get; }
        [Required] public bool DoesHaveHeader { set; get; }

        [Required] public bool DoesHaveAutoMap { set; get; }
        [Required] public string FieldTerminator { set; get; }
        [Required] public string RowTerminator { set; get; }
        
    }
}