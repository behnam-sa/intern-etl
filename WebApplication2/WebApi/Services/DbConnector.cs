﻿using Microsoft.Data.SqlClient;

namespace WebApi.Services
{
    public class DbConnector : ISqlConnector
    {
        public SqlConnection Connect(string host, string database)
        {
            var connectionString = $"Server={host};Database={database};Trusted_Connection=true";
            var connection = new SqlConnection(connectionString);
            return connection;
        }
    }
}