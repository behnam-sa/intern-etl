using System.Collections.Generic;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using WebApi.models;
using WebApi.Validations;

namespace WebApi
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            var database = new Database();
            // TestMethod(database);
            services.AddControllers();
            services.AddSwaggerGen(c => { c.SwaggerDoc("v1", new OpenApiInfo {Title = "WebApi", Version = "v1"}); });
            //default sever config
            const string connectionString = "Server= localhost ; Database= ETLproject; Integrated Security=SSPI;";
            services.AddSingleton(new SqlConnection(connectionString));
            services.AddSingleton(database);
            services.AddSingleton(new UserValidation(database));
        }

        private static void TestMethod(Database database)
        {
            var ts1 = new Connection()
            {
                DbPassword = "test1", ServerIp = "test1", DbUserName = "test1"
            };
            var ts2 = new Connection()
            {
                DbPassword = "test2", ServerIp = "test2", DbUserName = "test2"
            };
            var ts3 = new Connection()
            {
                DbPassword = "test3", ServerIp = "test3", DbUserName = "test3"
            };

            var nt1 = new User()
            {
                Avatar = "utest1", Email = "utest1", Password = "utest1", Token = "dfds", Username = "arash",
                FullName = "happy", IsLoggedIn = true, UserConnections = new HashSet<Connection>()
                {
                    ts1 , ts2 , ts3 
                }
            };
            database.Users.Add(nt1);
            database.SaveChanges();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "WebApi v1"));
            }

            app.UseHttpsRedirection();

            app.UseRouting();

            app.UseAuthorization();

            app.UseEndpoints(endpoints => { endpoints.MapControllers(); });
        }
    }
}