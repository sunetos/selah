var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var RAD2DEG = 180 / Math.PI;
var DEG2RAD = Math.PI / 180;
var b2Vec2 = this.Box2D.Common.Math.b2Vec2;
var b2BodyDef = this.Box2D.Dynamics.b2BodyDef;
var b2Body = this.Box2D.Dynamics.b2Body;
var b2FixtureDef = this.Box2D.Dynamics.b2FixtureDef;
var b2Fixture = this.Box2D.Dynamics.b2Fixture;
var b2World = this.Box2D.Dynamics.b2World;
var b2PolygonShape = this.Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = this.Box2D.Collision.Shapes.b2CircleShape;
var b2DebugDraw = this.Box2D.Dynamics.b2DebugDraw;
var b2BodyTypes = {
    'static': b2Body.b2_staticBody,
    'dynamic': b2Body.b2_dynamicBody,
    'kinematic': b2Body.b2_kinematicBody
};
var World = (function () {
    function World(gravity, debugContext) {
        this.M2PIX = 30;
        this.PIX2M = 1 / 30;
        this.STEP = 20;
        this.TIMESTEP = 1 / 20;
        this.bodiesToRemove = [];
        this.actors = [];
        this.bodies = [];
        this.paused = false;
        this.lastTimestamp = Date.now();
        this.fixedTimestepAccumulator = 0;
        gravity = gravity || new b2Vec2(0, 9.8);
        this.world = new b2World(gravity, true);
        if(debugContext) {
            this.addDebug(debugContext);
        }
        this.setup();
    }
    World.prototype.makeBody = function (type, w, h, x, y, fixCfg, bodyCfg) {
        var fixDef = new b2FixtureDef();
        if(typeof (w) === 'number') {
            fixDef.shape = new b2PolygonShape();
            fixDef.shape.SetAsBox(w * this.PIX2M, h * this.PIX2M);
        } else {
            fixDef.shape = new b2CircleShape(h * this.PIX2M);
        }
        if(fixCfg) {
            for(var prop in fixCfg) {
                fixDef[prop] = fixCfg[prop];
            }
        }
        var bodyDef = new b2BodyDef();
        bodyDef.type = b2BodyTypes[type];
        bodyDef.position.x = x * this.PIX2M;
        bodyDef.position.y = y * this.PIX2M;
        if(bodyCfg) {
            for(var prop in bodyCfg) {
                bodyDef[prop] = bodyCfg[prop];
            }
        }
        var body = this.world.CreateBody(bodyDef);
        body.CreateFixture(fixDef);
        if(type !== 'static') {
            this.bodies.push(body);
        }
        return body;
    };
    World.prototype.makeActor = function (skin, w, h, x, y, fixCfg, bodyCfg) {
        skin.x = x;
        skin.y = y;
        skin.snapToPixel = true;
        skin.mouseEnabled = false;
        if(typeof (w) === 'number') {
            skin.regX = w * 0.5;
            skin.regY = h * 0.5;
        } else {
            skin.regX = skin.regY = h;
        }
        var body = this.makeBody('dynamic', w, h, x, y, fixCfg, bodyCfg);
        var actor = new Actor(body, skin, this);
        body.SetUserData(actor);
        this.actors.push(actor);
        return actor;
    };
    World.prototype.setup = function () {
    };
    World.prototype.addDebug = function (debugContext) {
        var debugDraw = new b2DebugDraw();
        debugDraw.SetSprite(debugContext);
        debugDraw.SetDrawScale(this.M2PIX);
        debugDraw.SetFillAlpha(0.7);
        debugDraw.SetLineThickness(1);
        debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
        this.world.SetDebugDraw(debugDraw);
    };
    World.prototype.pause = function () {
        this.paused = true;
    };
    World.prototype.resume = function () {
        this.paused = false;
        this.lastTimestamp = Date.now();
    };
    World.prototype.toggle = function (state) {
        state = (state === undefined) ? !this.paused : state;
        if(state) {
            this.resume();
        } else {
            this.pause();
        }
    };
    World.prototype.update = function () {
        if(this.paused) {
            return;
        }
        var now = Date.now();
        var dt = now - this.lastTimestamp;
        this.fixedTimestepAccumulator += dt;
        this.lastTimestamp = now;
        while(this.fixedTimestepAccumulator >= this.STEP) {
            for(var i = 0, l = this.bodiesToRemove.length; i < l; ++i) {
                this.removeActor(this.bodiesToRemove[i].GetUserData());
                this.bodiesToRemove[i].SetUserData(null);
                this.world.DestroyBody(this.bodiesToRemove[i]);
            }
            this.bodiesToRemove = [];
            for(var i = 0, l = this.actors.length; i < l; ++i) {
                this.actors[i].update();
            }
            this.world.Step(this.TIMESTEP, 10, 10);
            this.fixedTimestepAccumulator -= this.STEP;
            this.world.ClearForces();
            if(this.world.m_debugDraw) {
                this.world.m_debugDraw.m_sprite.graphics.clear();
                this.world.DrawDebugData();
            }
            this.tick();
        }
    };
    World.prototype.tick = function () {
    };
    World.prototype.removeActor = function (actor) {
        stage.removeChild(actor.skin);
        this.actors.splice(this.actors.indexOf(actor), 1);
    };
    return World;
})();
var BirdWorld = (function (_super) {
    __extends(BirdWorld, _super);
    function BirdWorld() {
        _super.apply(this, arguments);

    }
    BirdWorld.prototype.setup = function () {
        var floor = this.makeBody('static', 500, 10, 0, 500, {
            density: 1,
            restitution: 1
        });
        var left = this.makeBody('static', 10, 500, -10, 0);
        var right = this.makeBody('static', 10, 500, 500, 0);
    };
    BirdWorld.prototype.makeBird = function (stage) {
        var birdBMP = new createjs.Bitmap('img/bird.png');
        stage.addChild(birdBMP);
        var x = Math.round(Math.random() * 500), y = -30, radius = 25;
        var actor = this.makeActor(birdBMP, 'circle', radius, x, y, {
            density: 1,
            restitution: 0.6
        });
    };
    BirdWorld.prototype.tick = function () {
        if(this.bodies.length > 30) {
            this.bodiesToRemove.push(this.bodies[0]);
            this.bodies.splice(0, 1);
        }
    };
    return BirdWorld;
})(World);
var Actor = (function () {
    function Actor(body, skin, world) {
        this.body = body;
        this.world = world;
        this.skin = skin;
    }
    Actor.prototype.update = function () {
        this.skin.rotation = this.body.GetAngle() * RAD2DEG;
        this.skin.x = this.body.GetWorldCenter().x * this.world.M2PIX;
        this.skin.y = this.body.GetWorldCenter().y * this.world.M2PIX;
    };
    return Actor;
})();
