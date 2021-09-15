﻿using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApi.models;
using WebApi.Validations;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class ConnectionController : ControllerBase
    {
        private readonly Database _database;
        private UserValidation _userValidation;

        public ConnectionController(Database database, UserValidation userValidation)
        {
            _database = database;
            _userValidation = userValidation;
        }

        [HttpPost]
        public async Task<IActionResult> AddNewConnection([FromBody] Connection connection, [FromHeader] string token)
        {
            if (!ModelState.IsValid) BadRequest();
            if (!connection.TestConnection()) return BadRequest("can't connect to sql server");
            var user = _database.Users.Include(u => u.UserConnections).FirstOrDefault(u => u.Token == token);
            try
            {
                Debug.Assert(user != null, nameof(user) + " != null");
                user.UserConnections.Add(connection);
            }
            catch (NullReferenceException e)
            {
                return BadRequest();
            }


            await _database.SaveChangesAsync();
            return Ok("connection added successfully");
        }


        [HttpDelete]
        [Route("{connectionId:int}")]
        public async Task<IActionResult> DeleteConnection([FromRoute] int connectionId, [FromHeader] string token)
        {
            var connection = _database.Connections.FirstOrDefaultAsync(ci => ci.ConnectionId == connectionId);
            if (connection == null) return BadRequest();
            _database.Connections.Remove(await connection);
            await _database.SaveChangesAsync();
            return Ok();
        }

        [HttpGet]
        [Route("{connectionId}")]
        public async Task<ActionResult<Connection>> GetConnection([FromRoute] int connectionId,
            [FromHeader] string token)
        {
            var connection = await _database.Connections.FirstOrDefaultAsync(ci => ci.ConnectionId == connectionId);
            if (connection == null) return BadRequest();
            return Ok(connection);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Connection>>> GetAllConnections([FromHeader] string token)
        {
            var user = await _database.Users.Include(u => u.UserConnections).FirstAsync(u => u.Token == token);
            return Ok(user.UserConnections);
        }
    }
}