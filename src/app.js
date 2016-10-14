"use strict";

/* Classes */
const Game = require('./game');
const Vector = require('./vector');

/* Global variables */
var canvas = document.getElementById('screen');
var game = new Game(canvas, update, render);
var image = new Image();
image.src = 'assets/pool_balls.png';

var axisList = [];
var pockets = [
  {x: 0, y: 0},
  {x: 512, y: 0},
  {x: 1024, y: 0},
  {x: 0, y: 512},
  {x: 512, y: 512},
  {x: 1024, y: 512}
];
var stick = {x: 0, y: 0, power: 0, charge: false};
var balls = [];
for(var i = 0; i < 16; i++){
  balls.push({
    number: i,
    position: {x: 0, y: 0},
    angle: 0,
    velocity: {x:0, y:0},
    color: 'gray',
    pocketed: false
  });
  axisList.push(balls[i]);
}
axisList.sort(function(a,b){return a.position.x - b.position.x});
rack();

/**
 * Helper function to rack the balls
 */
function rack() {
  balls[15].position.x = 732;
  balls[15].position.y = 266;

  balls[0].position.x = 266;
  balls[0].position.y = 266;

  balls[1].position.x = 240;
  balls[1].position.y = 250;
  balls[8].position.x = 240;
  balls[8].position.y = 281;

  balls[9].position.x = 212;
  balls[9].position.y = 236;
  balls[7].position.x = 212;
  balls[7].position.y = 266;
  balls[2].position.x = 212;
  balls[2].position.y = 298;

  balls[3].position.x = 185;
  balls[3].position.y = 218;
  balls[10].position.x = 185;
  balls[10].position.y = 250;
  balls[4].position.x = 185;
  balls[4].position.y = 282;
  balls[11].position.x = 185;
  balls[11].position.y = 314;

  balls[12].position.x = 157;
  balls[12].position.y = 205;
  balls[5].position.x = 157;
  balls[5].position.y = 236;
  balls[13].position.x = 157;
  balls[13].position.y = 266;
  balls[6].position.x = 157;
  balls[6].position.y = 297;
  balls[14].position.x = 157;
  balls[14].position.y = 328;
}

/**
 * Track the changing stick position relative
 * to the cue ball.
 */
canvas.onmousemove = function(event) {
  event.preventDefault();
  stick.x = event.offsetX;
  stick.y = event.offsetY;
}

/**
 * Begin charging the stick
 */
canvas.onmousedown = function(event) {
  event.preventDefault();

  stick.power = 0;
  stick.charging = true;
}

/**
 * Strike the cue ball with the stick
 */
canvas.onmouseup = function(event) {
  var direction = {
    x: balls[15].position.x - stick.x,
    y: balls[15].position.y - stick.y
  }
  var denom = direction.x * direction.x + direction.y * direction.y;
  direction.x /= denom;
  direction.y /= denom;
  balls[15].velocity.x = stick.power * direction.x;
  balls[15].velocity.y = stick.power * direction.y;
  stick.charging = false;
}

/**
 * @function masterLoop
 * Advances the game in sync with the refresh rate of the screen
 * @param {DOMHighResTimeStamp} timestamp the current time
 */
var masterLoop = function(timestamp) {
  game.loop(timestamp);
  window.requestAnimationFrame(masterLoop);
}
masterLoop(performance.now());


/**
 * @function update
 * Updates the game state, moving
 * game objects and handling interactions
 * between them.
 * @param {DOMHighResTimeStamp} elapsedTime indicates
 * the number of milliseconds passed since the last frame.
 */
function update(elapsedTime) {

  // charge cue stick
  if(stick.charging) {
    stick.power += 0.1 * elapsedTime;
  }

  // move balls
  balls.forEach(function(ball, index) {
    ball.color = 'gray';
    ball.position.x += elapsedTime * ball.velocity.x;
    ball.position.y += elapsedTime * ball.velocity.y;
    // bounce off bumpers
    if(ball.position.x < 15 || ball.position.x > 1009) {
      ball.velocity.x = -ball.velocity.x;
    }
    if(ball.position.y < 15 || ball.position.y > 497) {
      ball.velocity.y  = -ball.velocity.y;
    }
    // apply friction
    ball.velocity.x *= 0.999;
    ball.velocity.y *= 0.999;

    // check for pocket collisions
    pockets.forEach(function(pocket) {
      var distSq = Math.pow(ball.position.x - pocket.x, 2) +
                   Math.pow(ball.position.y - pocket.y, 2);
      if(distSq < 25 * 25) {
        if(index == 15) {
          // scratch
          ball.velocity.x = 0;
          ball.velocity.y = 0;
          ball.position.x = 732;
          ball.position.y = 266;
        } else {
          // ball in the pocket
          ball.pocketed = true;
          ball.velocity.x = 0;
          ball.velocity.y = 0;
          ball.position.x = -50;
        }
      }
    });
  });

  // re-sort our axis list by x position,
  // now that all our balls have moved.
  axisList.sort(function(a,b){return a.position.x - b.position.x});

  // The active list will hold all balls
  // we are currently considering for collisions
  var active = [];

  // The potentially colliding list will hold
  // all pairs of balls that overlap in the x-axis,
  // and therefore potentially collide
  var potentiallyColliding = [];

  // For each ball in the axis list, we consider it
  // in order
  axisList.forEach(function(ball, aindex){
    // remove balls from the active list that are
    // too far away from our current ball to collide
    // The Array.prototype.filter() method will return
    // an array containing only elements for which the
    // provided function's return value was true -
    // in this case, all balls that are closer than 30
    // units to our current ball on the x-axis
    active = active.filter(function(oball){
      return ball.position.x - oball.position.x  < 30;
    });
    // Since only balls within colliding distance of
    // our current ball are left in the active list,
    // we pair them with the current ball and add
    // them to the potentiallyColliding array.
    active.forEach(function(oball, bindex){
      potentiallyColliding.push({a: oball, b: ball});
    });
    // Finally, we add our current ball to the active
    // array to consider it in the next pass down the
    // axisList
    active.push(ball);
  });

  // At this point we have a potentaillyColliding array
  // containing all pairs overlapping in the x-axis.  Now
  // we want to check for REAL collisions between these pairs.
  // We'll store those in our collisions array.
  var collisions = [];
  potentiallyColliding.forEach(function(pair){
    // Calculate the distance between balls; we'll keep
    // this as the squared distance, as we just need to
    // compare it to a distance equal to the radius of
    // both balls summed.  Squaring this second value
    // is less computationally expensive than taking
    // the square root to get the actual distance.
    // In fact, we can cheat a bit more and use a constant
    // for the sum of radii, as we know the radius of our
    // balls won't change.
    var distSquared =
      Math.pow(pair.a.position.x - pair.b.position.x, 2) +
      Math.pow(pair.a.position.y - pair.b.position.y, 2);
    // (15 + 15)^2 = 900 -> sum of two balls' raidius squared
    if(distSquared < 900) {
      // Color the collision pair for visual debugging
      pair.a.color = 'red';
      pair.b.color = 'green';
      // Push the colliding pair into our collisions array
      collisions.push(pair);
    }
  });

  // TODO: Process ball collisions
  collisions.forEach(function(pair){
    //find the normal of collision
    var collisionNormal = {
      x: pair.a.position.x - pair.b.position.x,
      y: pair.a.position.y - pair.b.position.y
    }

    var overlap = 32- Vector.magnitude(collisionNormal)
    var collisionNormal = Vector.normalize(collisionNormal)
    pair.a.position.x += collisionNormal.x * overlap / 2;
    pair.a.position.y += collisionNormal.y * overlap / 2;
    pair.b.position.x -= collisionNormal.x * overlap / 2;
    pair.b.position.y -= collisionNormal.y * overlap / 2;
    //Rotate the problem space so thatthe normal
    //of the collision lies along the x-axis
    var angle = Math.atan2(collisionNormal.y,collisionNormal.x);
    var a = Vector.rotate(pair.a.velocity, angle);
    var b = Vector.rotate(pair.b.velocity, angle);

    //solve the collision along the x-axis
    var s = a.x;
    a.x = b.x;
    b.x = s;
    //rotate the problem space back to the world space
    a = Vector.rotate(a, -angle);
    b = Vector.rotate(b, -angle);
    pair.a.velocity.x = a.x;
    pair.a.velocity.y = a.y;
    pair.b.velocity.x = b.x;
    pair.b.velocity.y = b.y;
  });
}

/**
  * @function render
  * Renders the current game state into a back buffer.
  * @param {DOMHighResTimeStamp} elapsedTime indicates
  * the number of milliseconds passed since the last frame.
  * @param {CanvasRenderingContext2D} ctx the context to render to
  */
function render(elapsedTime, ctx) {
  // Render the table
  ctx.fillStyle = "#3F6922";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render the pockets
  ctx.fillStyle = "#333333";
  pockets.forEach(function(pocket){
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, 25, 0, 2*Math.PI);
    ctx.fill();
  });

  // Render the balls
  balls.forEach(function(ball, index) {
    if(!ball.pocketed){
      var sourceX = index % 4;
      var sourceY = Math.floor(index / 4);
      ctx.save();
      ctx.translate(-15, -15);
      ctx.rotate(ball.angle);
      ctx.translate(ball.position.x, ball.position.y);
      ctx.drawImage(image,
        // Source Image
        sourceX * 160, sourceY * 160, 160, 160,
        // Destination Image
        0, 0, 30, 30
      );
      ctx.beginPath();
      ctx.strokeStyle = ball.color;
      ctx.arc(15,15,15,0,2*Math.PI);
      ctx.stroke();
      ctx.restore();
    }
  });

  // Render the stick
  ctx.beginPath();
  ctx.moveTo(balls[15].position.x, balls[15].position.y);
  ctx.lineTo(stick.x, stick.y);
  if(stick.charging) {
    ctx.strokeStyle = "red";
  } else {
    ctx.strokeStyle = "darkgrey";
  }
  ctx.stroke();
  ctx.beginPath();
}
