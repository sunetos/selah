/// <reference path="defs/dt/jquery-1.8.d.ts" />
/// <reference path="defs/dt/easeljs/easeljs-0.5.d.ts" />
/// <reference path="defs/box2dweb/box2dweb.d.ts" />
/// <reference path="util.ts" />

// Box2d vars
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2Fixture = Box2D.Dynamics.b2Fixture;
var b2World = Box2D.Dynamics.b2World;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
var b2WorldManifold = Box2D.Collision.b2WorldManifold;
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
var b2ContactListener = Box2D.Dynamics.b2ContactListener;

var b2BodyTypes = {
    'static': b2Body.b2_staticBody,
    'dynamic': b2Body.b2_dynamicBody,
    'kinematic': b2Body.b2_kinematicBody,
};

var DEFAULT_GRAVITY = new b2Vec2(0, 9.8);

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
  public listener: Box2D.Dynamics.b2ContactListener;
  public bodiesToRemove = [];
  public actors: any[] = [];
  public bodies: any[] = [];
  public paused: bool = false;

  constructor(gravity?=DEFAULT_GRAVITY, debugContext?) {
    this.lastTimestamp = Date.now();
    this.fixedTimestepAccumulator = 0;

    gravity = new b2Vec2(0, 0);
    this.world = new b2World(gravity, true);
    if (debugContext) this.addDebug(debugContext);

    this.listener = new b2ContactListener();
    this.listener.PostSolve = (c, i) => this.postContact(c, i);
    this.world.SetContactListener(this.listener);

    this.setup()
  }

  // Subclasses should override this for collision detection events.
  postContact(contact, impulse) { }

  makeBody(type:string, w:any, h:number, x:number, y:number, fixCfg?:any,
           bodyCfg?:any) {
    var fixDef = new b2FixtureDef();
    if (typeof(w) === 'number') {
      fixDef.shape = new b2PolygonShape();
      (<Box2D.Collision.Shapes.b2PolygonShape>fixDef.shape).SetAsBox(
          w*this.PIX2M, h*this.PIX2M);
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
  private manifold = new b2WorldManifold();

  setup() {
    var fixCfg = {density: 1, friction: 0, restitution: 1};
    var bodyCfg = {userData: 'wall'};
    var w = 500, h = 500;
    var floor = this.makeBody('static', w, 10, 0, h, fixCfg, bodyCfg);
    var ceil = this.makeBody('static', w, 10, 0, 0, fixCfg, bodyCfg);
    var left = this.makeBody('static', 10, h, -10, 0, fixCfg, bodyCfg);
    var right = this.makeBody('static', 10, h, w, 0, fixCfg, bodyCfg);
  }

  makeBird(stage) {
    var fixCfg = {density: 1, friction: 0, restitution: 1};
    var bodyCfg = {bullet: true};
    var birdBMP = new createjs.Bitmap('img/bird.png');
    stage.addChild(birdBMP);
    var radius = 25;
    var x = Random.int(radius*2, 500 - radius*2),
        y = Random.int(radius*2, 500 - radius*2);
    var actor = this.makeActor(birdBMP, 'circle', radius, x, y, fixCfg, bodyCfg);
    var scale = 5;
    var xd = Math.cos(Random.radian())*scale,
        yd = Math.sin(Random.radian())*scale;
    var spawnDir = new b2Vec2(xd, yd);
    actor.body.ApplyImpulse(spawnDir, actor.body.GetWorldCenter());

    actor.onUpdate = function() {
      var vel = actor.body.GetLinearVelocity();
      var speed = vel.Length();
      if (speed != scale) {
        if (speed) {
          vel.Multiply(scale/speed);
        } else {
          vel.Normalize();
          vel.Multiply(speed);
        }
        actor.body.SetLinearVelocity(vel);
      }
    };
  }

  tick() {
    if (this.bodies.length > 10) {
      this.bodiesToRemove.push(this.bodies[0]);
      this.bodies.splice(0, 1);
    }
  }

  postContact(contact, impulse) {
    var ud1 = contact.GetFixtureA().GetBody().GetUserData(),
        ud2 = contact.GetFixtureB().GetBody().GetUserData();
    if (ud1 === 'wall' || ud2 === 'wall') {
      contact.GetWorldManifold(this.manifold);
      var point = this.manifold.m_points[0];
      var x = this.PIX2M*point.x, y = this.PIX2M*point.y;
      Msg.pub('wall-touch', x, y);
    }
  }
}

/** An actor has both an easeljs sprite and a box2d body. */
class Actor {
  public body: any;
  public skin: any;
  public world: World;

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

    this.onUpdate();
  }

  onUpdate() { }
}
