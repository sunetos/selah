/// <reference path="defs/dt/jquery-1.8.d.ts" />
/// <reference path="defs/dt/easeljs/easeljs-0.5.d.ts" />
/// <reference path="defs/box2dweb/box2dweb.d.ts" />

// Box2d vars
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2Fixture = Box2D.Dynamics.b2Fixture;
var b2World = Box2D.Dynamics.b2World;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;

declare var stage:createjs.Stage;
declare var box2d:Box2d;

class Box2d {
  // important box2d scale and speed vars
  private SCALE = 30;
  private STEP = 20;
  private TIMESTEP = 1/20;

	private world;
	private lastTimestamp: number;
	private fixedTimestepAccumulator: number;
	private bodiesToRemove = [];
	private actors: any[] = [];
	private bodies: any[] = [];
  constructor() {
    this.lastTimestamp = Date.now();
    this.fixedTimestepAccumulator = 0;
  }

  // box2d world setup and boundaries
  setup(debugContext?) {
    this.world = new b2World(new b2Vec2(0,10), true);
    if (debugContext) this.addDebug(debugContext);
    // boundaries - floor
    var floorFixture = new b2FixtureDef();
    floorFixture.density = 1;
    floorFixture.restitution = 1;
    floorFixture.shape = new b2PolygonShape();
    floorFixture.shape.SetAsBox(550 / this.SCALE, 10 / this.SCALE);
    var floorBodyDef = new b2BodyDef();
    floorBodyDef.type = b2Body.b2_staticBody;
    floorBodyDef.position.x = -25 / this.SCALE;
    floorBodyDef.position.y = 509 / this.SCALE;
    var floor = this.world.CreateBody(floorBodyDef);
    floor.CreateFixture(floorFixture);
    // boundaries - left
    var leftFixture = new b2FixtureDef();
    leftFixture.shape = new b2PolygonShape();
    leftFixture.shape.SetAsBox(10 / this.SCALE, 550 / this.SCALE);
    var leftBodyDef = new b2BodyDef();
    leftBodyDef.type = b2Body.b2_staticBody;
    leftBodyDef.position.x = -9 / this.SCALE;
    leftBodyDef.position.y = -25 / this.SCALE;
    var left = this.world.CreateBody(leftBodyDef);
    left.CreateFixture(leftFixture);
    // boundaries - right
    var rightFixture = new b2FixtureDef();
    rightFixture.shape = new b2PolygonShape();
    rightFixture.shape.SetAsBox(10 / this.SCALE, 550 / this.SCALE);
    var rightBodyDef = new b2BodyDef();
    rightBodyDef.type = b2Body.b2_staticBody;
    rightBodyDef.position.x = 509 / this.SCALE;
    rightBodyDef.position.y = -25 / this.SCALE;
    var right = this.world.CreateBody(rightBodyDef);
    right.CreateFixture(rightFixture);
  }

  // box2d debugger
  addDebug(debugContext) {
    var debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(debugContext);
    debugDraw.SetDrawScale(this.SCALE);
    debugDraw.SetFillAlpha(0.7);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
    this.world.SetDebugDraw(debugDraw);
  }

  // create bird body shape and assign actor object
  createBird(skin) {
    var birdFixture = new b2FixtureDef;
    birdFixture.density = 1;
    birdFixture.restitution = 0.6;
    birdFixture.shape = new b2CircleShape(24 / this.SCALE);
    var birdBodyDef = new b2BodyDef;
    birdBodyDef.type = b2Body.b2_dynamicBody;
    birdBodyDef.position.x = skin.x / this.SCALE;
    birdBodyDef.position.y = skin.y / this.SCALE;
    var bird = this.world.CreateBody(birdBodyDef);
    bird.CreateFixture(birdFixture);

    // assign actor
    var actor = new ActorObject(bird, skin, this);
    bird.SetUserData(actor);  // set the actor as user data of the body so we can use it later: body.GetUserData()
    this.bodies.push(bird);
  }

  // remove actor and it's skin object
  removeActor(actor) {
    stage.removeChild(actor.skin);
    this.actors.splice(this.actors.indexOf(actor),1);
  }

  // box2d update function. delta time is used to avoid differences in simulation if frame rate drops
  update() {
    var now = Date.now();
    var dt = now - this.lastTimestamp;
    this.fixedTimestepAccumulator += dt;
    this.lastTimestamp = now;
    while(this.fixedTimestepAccumulator >= this.STEP) {
      // remove bodies before world timestep
      for(var i=0, l=this.bodiesToRemove.length; i<l; i++) {
        this.removeActor(this.bodiesToRemove[i].GetUserData());
        this.bodiesToRemove[i].SetUserData(null);
        this.world.DestroyBody(this.bodiesToRemove[i]);
      }
      this.bodiesToRemove = [];

      // update active actors
      for(var i=0, l=this.actors.length; i<l; i++) {
        this.actors[i].update();
      }

      this.world.Step(this.TIMESTEP, 10, 10);

      this.fixedTimestepAccumulator -= this.STEP;
      this.world.ClearForces();
      this.world.m_debugDraw.m_sprite.graphics.clear();
      this.world.DrawDebugData();
      if(this.bodies.length > 30) {
        this.bodiesToRemove.push(this.bodies[0]);
        this.bodies.splice(0,1);
      }
    }
  }

  pauseResume(p) {
    if(p) {
      this.TIMESTEP = 0;
    } else {
      this.TIMESTEP = 1/this.STEP;
    }
    this.lastTimestamp = Date.now();
  }

  pushActors(actor) {
      this.actors.push(actor);
  }

  get scale() {
      return this.SCALE;
  }
}

class ActorObject {
  // actor object - this is responsible for taking the body's position and translating it to your easel display object
  private body: any;
	private skin: any;
  private box2d: Box2d;

  constructor(body: any, skin:any, box2d: Box2d) {
    this.body = body;
    this.box2d = box2d;
    this.skin = skin;

    this.box2d.pushActors(this);
  }

  update() {  // translate box2d positions to pixels
		this.skin.rotation = this.body.GetAngle() * (180 / Math.PI);
		this.skin.x = this.body.GetWorldCenter().x * this.box2d.scale;
		this.skin.y = this.body.GetWorldCenter().y * this.box2d.scale;
	}
}

class Birds {
  spawn() {
		var birdBMP = new createjs.Bitmap('img/bird.png');
		birdBMP.x = Math.round(Math.random()*500);
		birdBMP.y = -30;
		birdBMP.regX = 25;   // important to set origin point to center of your bitmap
		birdBMP.regY = 25;
		birdBMP.snapToPixel = true;
		birdBMP.mouseEnabled = false;
		stage.addChild(birdBMP);
		box2d.createBird(birdBMP);
	}
}
