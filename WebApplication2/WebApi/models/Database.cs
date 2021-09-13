﻿
using Microsoft.EntityFrameworkCore;
using WebApi.Authentication;

namespace WebApi.models
{
    public class Database : DbContext
    {
        public DbSet<User> Users { get; set; }
        public DbSet<Connection> Connections { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.UseSqlServer(@"Server=localhost; Database=Etl; Trusted_Connection=True;");
        }
    }
}