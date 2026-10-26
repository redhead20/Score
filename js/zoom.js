export class Zoom {
 constructor(onChange){this.value=1;this.onChange=onChange}
 set(value){this.value=Math.max(.5,Math.min(5,value));this.onChange(this.value)}
 in(){this.set(this.value*1.25)}
 out(){this.set(this.value/1.25)}
 fit(){this.set(1)}
}
