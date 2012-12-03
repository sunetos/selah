var b2Vec2 = this.Box2D.Common.Math.b2Vec2;
var b2BodyDef = this.Box2D.Dynamics.b2BodyDef;
var b2Body = this.Box2D.Dynamics.b2Body;
var b2FixtureDef = this.Box2D.Dynamics.b2FixtureDef;
var b2Fixture = this.Box2D.Dynamics.b2Fixture;
var b2World = this.Box2D.Dynamics.b2World;
var b2PolygonShape = this.Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = this.Box2D.Collision.Shapes.b2CircleShape;
var b2DebugDraw = this.Box2D.Dynamics.b2DebugDraw;
var Box2d = (function () {
    function Box2d() {
        this.SCALE = 30;
        this.STEP = 20;
        this.TIMESTEP = 1 / 20;
        this.bodiesToRemove = [];
        this.actors = [];
        this.bodies = [];
        this.lastTimestamp = Date.now();
        this.fixedTimestepAccumulator = 0;
    }
    Box2d.prototype.setup = function (debugContext) {
        this.world = new b2World(new b2Vec2(0, 10), true);
        if(debugContext) {
            this.addDebug(debugContext);
        }
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
        var leftFixture = new b2FixtureDef();
        leftFixture.shape = new b2PolygonShape();
        leftFixture.shape.SetAsBox(10 / this.SCALE, 550 / this.SCALE);
        var leftBodyDef = new b2BodyDef();
        leftBodyDef.type = b2Body.b2_staticBody;
        leftBodyDef.position.x = -9 / this.SCALE;
        leftBodyDef.position.y = -25 / this.SCALE;
        var left = this.world.CreateBody(leftBodyDef);
        left.CreateFixture(leftFixture);
        var rightFixture = new b2FixtureDef();
        rightFixture.shape = new b2PolygonShape();
        rightFixture.shape.SetAsBox(10 / this.SCALE, 550 / this.SCALE);
        var rightBodyDef = new b2BodyDef();
        rightBodyDef.type = b2Body.b2_staticBody;
        rightBodyDef.position.x = 509 / this.SCALE;
        rightBodyDef.position.y = -25 / this.SCALE;
        var right = this.world.CreateBody(rightBodyDef);
        right.CreateFixture(rightFixture);
    };
    Box2d.prototype.addDebug = function (debugContext) {
        var debugDraw = new b2DebugDraw();
        debugDraw.SetSprite(debugContext);
        debugDraw.SetDrawScale(this.SCALE);
        debugDraw.SetFillAlpha(0.7);
        debugDraw.SetLineThickness(1);
        debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
        this.world.SetDebugDraw(debugDraw);
    };
    Box2d.prototype.createBird = function (skin) {
        var birdFixture = new b2FixtureDef();
        birdFixture.density = 1;
        birdFixture.restitution = 0.6;
        birdFixture.shape = new b2CircleShape(24 / this.SCALE);
        var birdBodyDef = new b2BodyDef();
        birdBodyDef.type = b2Body.b2_dynamicBody;
        birdBodyDef.position.x = skin.x / this.SCALE;
        birdBodyDef.position.y = skin.y / this.SCALE;
        var bird = this.world.CreateBody(birdBodyDef);
        bird.CreateFixture(birdFixture);
        var actor = new ActorObject(bird, skin, this);
        bird.SetUserData(actor);
        this.bodies.push(bird);
    };
    Box2d.prototype.removeActor = function (actor) {
        stage.removeChild(actor.skin);
        this.actors.splice(this.actors.indexOf(actor), 1);
    };
    Box2d.prototype.update = function () {
        var now = Date.now();
        var dt = now - this.lastTimestamp;
        this.fixedTimestepAccumulator += dt;
        this.lastTimestamp = now;
        while(this.fixedTimestepAccumulator >= this.STEP) {
            for(var i = 0, l = this.bodiesToRemove.length; i < l; i++) {
                this.removeActor(this.bodiesToRemove[i].GetUserData());
                this.bodiesToRemove[i].SetUserData(null);
                this.world.DestroyBody(this.bodiesToRemove[i]);
            }
            this.bodiesToRemove = [];
            for(var i = 0, l = this.actors.length; i < l; i++) {
                this.actors[i].update();
            }
            this.world.Step(this.TIMESTEP, 10, 10);
            this.fixedTimestepAccumulator -= this.STEP;
            this.world.ClearForces();
            this.world.m_debugDraw.m_sprite.graphics.clear();
            this.world.DrawDebugData();
            if(this.bodies.length > 30) {
                this.bodiesToRemove.push(this.bodies[0]);
                this.bodies.splice(0, 1);
            }
        }
    };
    Box2d.prototype.pauseResume = function (p) {
        if(p) {
            this.TIMESTEP = 0;
        } else {
            this.TIMESTEP = 1 / this.STEP;
        }
        this.lastTimestamp = Date.now();
    };
    Box2d.prototype.pushActors = function (actor) {
        this.actors.push(actor);
    };
    Object.defineProperty(Box2d.prototype, "scale", {
        get: function () {
            return this.SCALE;
        },
        enumerable: true,
        configurable: true
    });
    return Box2d;
})();
var ActorObject = (function () {
    function ActorObject(body, skin, box2d) {
        this.body = body;
        this.box2d = box2d;
        this.skin = skin;
        this.box2d.pushActors(this);
    }
    ActorObject.prototype.update = function () {
        this.skin.rotation = this.body.GetAngle() * (180 / Math.PI);
        this.skin.x = this.body.GetWorldCenter().x * this.box2d.scale;
        this.skin.y = this.body.GetWorldCenter().y * this.box2d.scale;
    };
    return ActorObject;
})();
var Birds = (function () {
    function Birds() { }
    Birds.prototype.spawn = function () {
        var birdBMP = new createjs.Bitmap('img/bird.png');
        birdBMP.x = Math.round(Math.random() * 500);
        birdBMP.y = -30;
        birdBMP.regX = 25;
        birdBMP.regY = 25;
        birdBMP.snapToPixel = true;
        birdBMP.mouseEnabled = false;
        stage.addChild(birdBMP);
        box2d.createBird(birdBMP);
    };
    return Birds;
})();
