precision mediump float;
uniform vec2 u_textureDim;
uniform vec2 u_textureDimCreases;
uniform sampler2D u_lastPosition;
uniform sampler2D u_originalPosition;
uniform sampler2D u_creaseMeta2;

vec3 getPosition(float index1D){
  vec2 index = vec2(mod(index1D, u_textureDim.x)+0.5, floor(index1D/u_textureDim.x)+0.5);
  vec2 scaledIndex = index/u_textureDim;
  return texture2D(u_lastPosition, scaledIndex).xyz + texture2D(u_originalPosition, scaledIndex).xyz;
}

void main(){
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 scaledFragCoord = fragCoord/u_textureDimCreases;

  vec4 creaseMeta = texture2D(u_creaseMeta2, scaledFragCoord);

  vec3 node1 = getPosition(creaseMeta[0]);
  vec3 node2 = getPosition(creaseMeta[1]);
  vec3 node3 = getPosition(creaseMeta[2]);
  vec3 node4 = getPosition(creaseMeta[3]);

  float tol = 0.000001;

  vec3 creaseVector = node4-node3;
  float creaseLength = length(creaseVector);

  if (abs(creaseLength)<tol) {
    gl_FragColor = vec4(-1);//disable crease
    return;
  }
  creaseVector /= creaseLength;

  vec3 vector1 = node1-node3;
  vec3 vector2 = node2-node3;

  float proj1Length = dot(creaseVector, vector1);
  float proj2Length = dot(creaseVector, vector2);

  float dist1 = sqrt(abs(vector1.x*vector1.x+vector1.y*vector1.y+vector1.z*vector1.z-proj1Length*proj1Length));
  float dist2 = sqrt(abs(vector2.x*vector2.x+vector2.y*vector2.y+vector2.z*vector2.z-proj2Length*proj2Length));

  if (dist1<tol || dist2<tol){
    gl_FragColor = vec4(-1);//disable crease
    return;
  }

  gl_FragColor = vec4(dist1, dist2, proj1Length/creaseLength, proj2Length/creaseLength);
}