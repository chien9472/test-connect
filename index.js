const { captureRejectionSymbol } = require('events');
const { futimesSync } = require('fs');
const { getuid } = require('process');

var express = require('express');
var app = express();
//var http = require('http').Server(app);
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(process.env.PORT || 3000, function(){
    console.log('listing on 3000');
});

//server.listen(3000);

// global varialbes for server

var enemies = [];
var playerSpawnPoints = [];
var clients = [];



io.on( 'connection', function(socket)
{
    var currentPlayer = {};
    currentPlayer.name = 'unknown';
    
    socket.on('player connect', function(){
        console.log(currentPlayer.name + ' connect');
        for(var i = 0 ; i < clients.length; i++){
            var playerConnected = {
                name: clients[i].name,
                posi: clients[i].posi,
                rota: clients[i].rota,
                health: clients[i].health
            }
            // TODO 
            // in your current game we need tell you about the other player
            socket.emit('other player connected',playerConnected );
            //console.log(currentPlayer.name + ' emit: other player connected: ' + JSON.stringify(playerConnected));
        }
        
    });

    socket.on('play', function(data){
        console.log(currentPlayer.name + ' recv play: '+ JSON.stringify(data));
        if( clients.length === 0  ){
            numberOfEnemies = data.enemySpawnPoints.length;
            enemies = [];
            data.enemySpawnPoints.forEach( function(enemySpawnPoint){
                var enemy = {
                    name: guid(),
                    posi: enemySpawnPoint.posi,
                    rota: enemySpawnPoint.rota,
                    health: 100
                };
                enemies.push(enemy);
            });
            playerSpawnPoints = [];
            data.playerSpawnPoints.forEach(function(_playerSpawnPoint){
                var playerSpawnPoint = {
                    posi: _playerSpawnPoint.posi,
                    rota: _playerSpawnPoint.rota
                };
                playerSpawnPoints.push(playerSpawnPoint);
            });
        }
        var enemiesResponse ={
            enemies: enemies
        };
        //console.log(currentPlayer.name + ' emit: enemies: ' + JSON.stringify(enemiesResponse));
        socket.emit('enemies', enemiesResponse);

        var randomSpawnPoint = playerSpawnPoints[Math.floor(Math.random() * playerSpawnPoints.length)];

        console.log(' playerSpawnPoints ' + JSON.stringify(playerSpawnPoints));

        currentPlayer={
                name: data.name,
                posi: randomSpawnPoint.posi,
                rota: randomSpawnPoint.rota,
                health: 100
        };
        clients.push(currentPlayer);
        // in your current game, tell that you have joined
        console.log(currentPlayer.name + ' emit: play:' + JSON.stringify(currentPlayer));
        socket.emit('play', currentPlayer);
        // in your current game, we hneed to tell the other players about you
        socket.broadcast.emit('other plyer connected', currentPlayer);
            
    });

    socket.on('player move', function(data){
        //console.log(' recv: move: ' + JSON.stringify(data));
        currentPlayer.posi = data.posi;
        socket.broadcast.emit('player move', currentPlayer);
    });

    socket.on('player turn',function(data){
        //console.log(' recv: turn: ' + JSON.stringify(data));
        currentPlayer.rota = data.rota;
        socket.broadcast.emit('player turn', currentPlayer);
    });

    socket.on('player shoot', function(){
        console.log();
        var data ={
            name: currentPlayer.name,
        };
        console.log(currentPlayer.name + ' shoot: ' + JSON.stringify(data));
        socket.emit('player shoot', data);
        socket.broadcast.emit('player shoot', data);
    });

    socket.on('health', function(data){
         //console.log(currentPlayer.name + ' recv: health: ' + JSON.stringify(data));
        //  var revdata = JSON.stringify(data);
        //  console.log("data :" + JSON.stringify(data));
        //  console.log("name data : " + data.name);
         // only chamge the health once, wwe can do this bu checking the originating player
         if( data.from === currentPlayer.name ){
            
            var indexDamaged= 0;
            if( !data.isEnemy ){
                clients = clients.map( function ( client, index ){
                    if( client.name === data.name ){
                        indexDamaged = index;
                        client.health -= data.healthChange;
                    }
                    return client;
                });
            }
            else{
                enemies = enemies.map( function(enemy, index) {
                    if( enemy.name === data.name ){
                        indexDamaged = index;
                        enemy.health -= data.healthChange;
                    }
                    return enemy;
                });
            }
            var response = {
                name: (!data.isEnemy) ? clients[indexDamaged].name : enemies[indexDamaged].name,
                health: (!data.isEnemy) ? clients[indexDamaged].health : enemies[indexDamaged].health
            };
           
            //console.log("enemies : " + response);
            
            console.log(currentPlayer.name + ' bcst: health: ' + JSON.stringify(response));
            socket.emit('health', response);
            socket.broadcast.emit('health', response);

         }
            
         
    });

    socket.on('disconnect', function(){
        console.log(currentPlayer.name + ' recv: disconnect ' + currentPlayer.name);
        socket.broadcast.emit('other player disconnected', currentPlayer);
        console.log(currentPlayer.name + ' bcst: other player disconnect ' + JSON.stringify(currentPlayer));
        for( var i = 0 ; i < clients.length ; i++  ){
            if( clients[i].name === currentPlayer.name) {
                clients.splice(i,1);
            }
        }
    });
    // socket.emit('message', { hello: 'world' });
    // socket.on( 'message', function(data){
    //     console.log(data);
    // });
});

console.log('Server is running!!' + guid());

function guid(){
    function s4(){
        return Math.floor((1+Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}