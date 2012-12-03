/// <reference path="libs/defs/jquery-1.8.d.ts" />
/// <reference path="libs/defs/tween.js-r7.d.ts" />

/** Simple lightweight pubsub. */
module Msg {
  var subs = {};

  export function sub(topic:string, cb:Function, context:any=window) {
    (subs[topic] = subs[topic] || []).push([cb, context]);
  };

  export function unsub(topic:string, cb?:Function, context:any=window) {
    if (cb) {
      var cbs = subs[topic];
      for (var i = 0; i < cbs.length; ++i) {
        var cbi = cbs[i];
        if (cb === cbi[0] && context === cbi[1]) {
          cbs.splice(i, 1);
          --i;
        }
      }
    } else {
      delete subs[topic];
    }
  };

  export function pub(topic:string, ...args: any[]) {
    subs[topic] && subs[topic].forEach(function(cbi) {
      cbi[0].apply(cbi[1], args);
    });
  };
}

interface String {
  toTitleCase():string;
}
String.prototype.toTitleCase = function() {
  return this.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

module Random {
  export function int(min:number, max:number):number {
    return ((Math.random()*(max - min + 1)) + min) | 0;
  }
  export function choice(items:any[]):any {
    return items[int(0, items.length - 1)];
  }
  export function scale(scale:number=1.0):number {
    return Math.random()*scale;
  }
  export function chance(outOf:number=1):bool {
    return (int(1, outOf) === 1);
  }
}

function proxy(context:any, prop:string):Function {
  //return $.proxy(context, prop);
  return context[prop].bind(context);
}

/** Automate boilerplate for things like callbacks after stopping typing. */
function renewableTimeout(func, delay) {
  var callT = null, callI = delay;
  function callClear() {
    if (callT) {
      clearTimeout(callT);
      callT = null;
    }
  }
  function callSet(overrideI?) {
    callClear();
    callT = setTimeout(function() {
      callT = null;
      func();
    }, (overrideI !== undefined) ? overrideI : callI);
  }
  function callRun() {
    callClear();
    func();
  }
  return {clear: callClear, set: callSet, run: callRun};
}
