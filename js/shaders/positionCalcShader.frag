precision mediump float;
uniform vec2 u_textureDim;
uniform float u_dt;
uniform sampler2D u_lastPosition;
uniform sampler2D u_velocity;
uniform sampler2D u_mass;

void main(){
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 scaledFragCoord = fragCoord/u_textureDim;

  vec3 lastPosition = texture2D(u_lastPosition, scaledFragCoord).xyz;

  float isFixed = texture2D(u_mass, scaledFragCoord).y;
  if (isFixed == 1.0){
    gl_FragColor = vec4(lastPosition, 0.0);
    return;
  }

  vec4 velocityData = texture2D(u_velocity, scaledFragCoord);
  vec3 position = velocityData.xyz*u_dt + lastPosition;
  gl_FragColor = vec4(position, velocityData.a);//velocity.a has error info
}
