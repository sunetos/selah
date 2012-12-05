/// <reference path="defs/dt/jquery-1.8.d.ts" />
/// <reference path="defs/dt/easeljs/easeljs-0.5.d.ts" />
/// <reference path="defs/box2dweb/box2dweb.d.ts" />

var RAD2DEG = 180.0/Math.PI;
var DEG2RAD = Math.PI/180.0;

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
var b2BodyTypes = {
    'static': b2Body.b2_staticBody,
    'dynamic': b2Body.b2_dynamicBody,
    'kinematic': b2Body.b2_kinematicBody,
};

declare var stage:createjs.Stage;
declare var world:BirdWorld;

class World {
  // important box2d scale and speed vars
  public M2PIX = 30;
  public PIX2M = 1.0/30;
  public STEP = 20;
  public TIMESTEP = 1/20;

  public world;
  public lastTimestamp: number;
  public fixedTimestepAccumulator: number;
  public bodiesToRemove = [];
  public actors: any[] = [];
  public bodies: any[] = [];
  public paused: bool = false;

  constructor(gravity?, debugContext?) {
    this.lastTimestamp = Date.now();
    this.fixedTimestepAccumulator = 0;

    gravity = gravity || new b2Vec2(0, 9.8);
    this.world = new b2World(gravity, true);
    if (debugContext) this.addDebug(debugContext);

    this.setup()
  }

  makeBody(type:string, w:any, h:number, x:number, y:number, fixCfg?:any,
           bodyCfg?:any) {
    var fixDef = new b2FixtureDef();
    if (typeof(w) === 'number') {
      fixDef.shape = new b2PolygonShape();
      fixDef.shape.SetAsBox(w*this.PIX2M, h*this.PIX2M);
    } else {
      fixDef.shape = new b2CircleShape(h*this.PIX2M);
    }
    if (fixCfg) for (var prop in fixCfg) fixDef[prop] = fixCfg[prop];

    var bodyDef = new b2BodyDef();
    bodyDef.type = b2BodyTypes[type];
    bodyDef.position.x = x*this.PIX2M;
    bodyDef.position.y = y*this.PIX2M;
    if (bodyCfg) for (var prop in bodyCfg) bodyDef[prop] = bodyCfg[prop];

    var body = this.world.CreateBody(bodyDef);
    body.CreateFixture(fixDef);
    if (type !== 'static') this.bodies.push(body);
    return body;
  }

  makeActor(skin:createjs.DisplayObject, w:any, h:number, x:number, y:number,
            fixCfg?:any, bodyCfg?:any) {

    skin.x = x;
    skin.y = y;
    skin.snapToPixel = true;
    skin.mouseEnabled = false;

    if (typeof(w) === 'number') {
      skin.regX = w*0.5;
      skin.regY = h*0.5;
    } else {
      skin.regX = skin.regY = h;
    }

    var body = this.makeBody('dynamic', w, h, x, y, fixCfg, bodyCfg);
    var actor = new Actor(body, skin, this);
    body.SetUserData(actor);
    this.actors.push(actor);
    return actor;
  }

  // Subclasses should override this to create the world.
  setup() { }

  addDebug(debugContext) {
    var debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(debugContext);
    debugDraw.SetDrawScale(this.M2PIX);
    debugDraw.SetFillAlpha(0.7);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
    this.world.SetDebugDraw(debugDraw);
  }

  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
    this.lastTimestamp = Date.now();
  }
  toggle(state?:bool) {
    state = (state === undefined) ? !this.paused : state;
    if (state) this.resume();
    else this.pause();
  }

  update() {
    if (this.paused) return;

    var now = Date.now();
    var dt = now - this.lastTimestamp;
    this.fixedTimestepAccumulator += dt;
    this.lastTimestamp = now;
    while (this.fixedTimestepAccumulator >= this.STEP) {
      // remove bodies before world timestep
      for (var i = 0, l = this.bodiesToRemove.length; i < l; ++i) {
        this.removeActor(this.bodiesToRemove[i].GetUserData());
        this.bodiesToRemove[i].SetUserData(null);
        this.world.DestroyBody(this.bodiesToRemove[i]);
      }
      this.bodiesToRemove = [];

      // update active actors
      for (var i = 0, l = this.actors.length; i < l; ++i) {
        this.actors[i].update();
      }

      this.world.Step(this.TIMESTEP, 10, 10);

      this.fixedTimestepAccumulator -= this.STEP;
      this.world.ClearForces();
      if (this.world.m_debugDraw) {
        this.world.m_debugDraw.m_sprite.graphics.clear();
        this.world.DrawDebugData();
      }
      this.tick();
    }
  }

  tick() { }

  /** Remove actor and its skin object. */
  removeActor(actor) {
    stage.removeChild(actor.skin);
    this.actors.splice(this.actors.indexOf(actor), 1);
  }
}

class BirdWorld extends World {
  setup() {
    var floor = this.makeBody('static', 500, 10, 0, 500,
                              {density: 1, restitution: 1});
    var left = this.makeBody('static', 10, 500, -10, 0);
    var right = this.makeBody('static', 10, 500, 500, 0);
  }

  makeBird(stage) {
    var birdBMP = new createjs.Bitmap('img/bird.png');
    stage.addChild(birdBMP);
    var x = Math.round(Math.random()*500), y = -30, radius = 25;
    var actor = this.makeActor(birdBMP, 'circle', radius, x, y,
                               {density: 1, restitution: 0.6});
  }

  tick() {
    if (this.bodies.length > 30) {
      this.bodiesToRemove.push(this.bodies[0]);
      this.bodies.splice(0,1);
    }
  }
}

/** An actor has both an easeljs sprite and a box2d body. */
class Actor {
  private body: any;
  private skin: any;
  private world: World;

  constructor(body:any, skin:any, world:World) {
    this.body = body;
    this.world = world;
    this.skin = skin;
  }

  /** Translate pixels to box2d units and back. */
  update() {
    this.skin.rotation = this.body.GetAngle()*RAD2DEG;
    this.skin.x = this.body.GetWorldCenter().x*this.world.M2PIX;
    this.skin.y = this.body.GetWorldCenter().y*this.world.M2PIX;
  }
}
