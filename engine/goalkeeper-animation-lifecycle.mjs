// Deterministic goalkeeper animation lifecycle. No wall-clock timers are used:
// the renderer supplies frame deltas and clip-finished/load-failed events.
const TERMINAL=new Set(["complete","failed"]);
const validMs=(v,n)=>{if(!Number.isFinite(v)||v<0)throw new RangeError(n+" must be a non-negative number");return v};
export class GoalkeeperAnimationLifecycle {
  constructor({clipLoadTimeoutMs=5000,recenterTolerance=.08}={}) {
    this.clipLoadTimeoutMs=validMs(clipLoadTimeoutMs,"clipLoadTimeoutMs");
    this.recenterTolerance=validMs(recenterTolerance,"recenterTolerance");
    this.generation=0; this.queue=[]; this.reset();
  }
  reset(){this.generation++;this.queue.length=0;this.state={phase:"idle",generation:this.generation,action:null,clip:null,elapsedMs:0,clipDurationMs:null,loadElapsedMs:0,clipLoaded:false,hasEmbeddedRecovery:false,requiresRecenter:false,keeperDown:false,reason:null};return this.snapshot();}
  snapshot(){return Object.freeze({...this.state,queued:this.queue.length});}
  enqueue(action){if(!action||typeof action!=="object")throw new TypeError("action must be an object");this.queue.push(Object.freeze({...action}));return this.queue.length;}
  beginNext(){if(this.state.phase!=="idle"&&!TERMINAL.has(this.state.phase))return null;const next=this.queue.shift();if(!next)return null;return this.begin(next);}
  begin({action="save",clip,hasEmbeddedRecovery=true,requiresRecenter=false,keeperDown=false}={}){
    const recoveryPending=this.state.phase==="needs-get-up"||this.state.phase==="needs-reposition";
    if(this.state.phase!=="idle"&&!TERMINAL.has(this.state.phase)&&!recoveryPending)throw new Error("cannot interrupt active goalkeeper animation");
    if(this.state.phase==="needs-get-up"&&action!=="getUp")throw new Error("get-up is required before another action");
    if(this.state.phase==="needs-reposition"&&action!=="reposition")throw new Error("repositioning is required before another action");
    if(typeof clip!=="string"||!clip.trim())throw new TypeError("clip is required");
    if(!["save","miss","getUp","reposition"].includes(action))throw new RangeError("unsupported goalkeeper action");
    this.generation++;this.state={phase:"loading",generation:this.generation,action,clip,elapsedMs:0,clipDurationMs:null,loadElapsedMs:0,clipLoaded:false,hasEmbeddedRecovery:!!hasEmbeddedRecovery,requiresRecenter:!!requiresRecenter,keeperDown:!!keeperDown,reason:null};
    return this.snapshot();
  }
  clipLoaded(generation,durationMs){if(!this.#current(generation)||this.state.phase!=="loading")return false;this.state.clipDurationMs=validMs(durationMs,"durationMs");if(durationMs<=0){this.#fail("invalid-clip-duration");return false;}this.state.clipLoaded=true;this.state.phase="playing";return true;}
  tick(deltaMs){const dt=validMs(deltaMs,"deltaMs");if(this.state.phase==="loading"){this.state.loadElapsedMs+=dt;if(this.state.loadElapsedMs>=this.clipLoadTimeoutMs)this.#fail("clip-load-timeout");}else if(this.state.phase==="playing"){this.state.elapsedMs+=dt;if(this.state.elapsedMs>=this.state.clipDurationMs)this.clipFinished(this.state.generation);}return this.snapshot();}
  clipFinished(generation){if(!this.#current(generation)||this.state.phase!=="playing")return false;
    if(this.state.action==="reposition"||this.state.action==="getUp"){this.state.phase="complete";return true;}
    if(this.state.action==="miss"){if(this.state.keeperDown){this.state.phase="needs-get-up";}else this.state.phase="complete";return true;}
    // Save clips generally contain their own get-up/recovery. Never append a second get-up.
    if(this.state.requiresRecenter){this.state.phase="needs-reposition";return true;}
    if(!this.state.hasEmbeddedRecovery&&this.state.keeperDown){this.state.phase="needs-get-up";return true;}
    this.state.phase="complete";return true;
  }
  beginRecovery({clip,action="getUp"}={}){if(!["needs-get-up","needs-reposition"].includes(this.state.phase))throw new Error("recovery is not pending");if(this.state.phase==="needs-reposition"&&action!=="reposition")throw new Error("this save requires repositioning, not a second get-up");if(this.state.phase==="needs-get-up"&&action!=="getUp")throw new Error("get-up is required");return this.begin({action,clip,hasEmbeddedRecovery:false,keeperDown:false});}
  #current(generation){return Number.isInteger(generation)&&generation===this.state.generation;}
  #fail(reason){this.state.phase="failed";this.state.reason=reason;this.state.clipLoaded=false;this.state.clipDurationMs=null;}
  clipLoadFailed(generation,reason="clip-load-failed"){if(!this.#current(generation)||this.state.phase!=="loading")return false;this.#fail(String(reason));return true;}
  get canStartNext(){return this.state.phase==="idle"||TERMINAL.has(this.state.phase);}
}

// States that must play once. In particular, fingertip is not a looping pose.
export const GOALKEEPER_ONE_SHOT_STATES=Object.freeze(["keeperDiveLeft","keeperDiveRight","keeperDiveLowLeft","keeperDiveLowRight","keeperCatch","keeperParry","keeperScoop","keeperMiss","keeperFingertip","keeperDropKick","keeperThrow","keeperPlace"]);