precision mediump float;
uniform vec2 u_textureDim;
uniform vec2 u_textureDimEdges;
uniform vec2 u_textureDimFaces;
uniform vec2 u_textureDimCreases;
uniform vec2 u_textureDimNodeCreases;
uniform vec2 u_textureDimNodeFaces;
uniform float u_creasePercent;
uniform float u_dt;
uniform float u_axialStiffness;
uniform float u_faceStiffness;
uniform sampler2D u_lastPosition;
uniform sampler2D u_lastLastPosition;
uniform sampler2D u_lastVelocity;
uniform sampler2D u_originalPosition;
uniform sampler2D u_externalForces;
uniform sampler2D u_mass;
uniform sampler2D u_meta;//[beamsIndex, numBeam, nodeCreaseMetaIndex, numCreases]
uniform sampler2D u_beamMeta;//[k, d, length, otherNodeIndex]
uniform sampler2D u_creaseMeta;//[k, d, targetTheta]
uniform sampler2D u_nodeCreaseMeta;//[creaseIndex, nodeIndex, -, -]
uniform sampler2D u_normals;
uniform sampler2D u_theta;//[theta, z, normal1Index, normal2Index]
uniform sampler2D u_creaseGeo;//[h1, h2, coef1, coef2]
uniform sampler2D u_meta2;//[nodesFaceIndex, numFaces]
uniform sampler2D u_nodeFaceMeta;//[faceIndex, a, b, c]
uniform sampler2D u_nominalTriangles;//[angleA, angleB, angleC]

vec4 getFromArray(float index1D, vec2 dimensions, sampler2D tex){
  vec2 index = vec2(mod(index1D, dimensions.x)+0.5, floor(index1D/dimensions.x)+0.5);
  vec2 scaledIndex = index/dimensions;
  return texture2D(tex, scaledIndex);
}

vec3 getPosition(float index1D){
  vec2 index = vec2(mod(index1D, u_textureDim.x)+0.5, floor(index1D/u_textureDim.x)+0.5);
  vec2 scaledIndex = index/u_textureDim;
  return texture2D(u_lastPosition, scaledIndex).xyz + texture2D(u_originalPosition, scaledIndex).xyz;
}

void main(){
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 scaledFragCoord = fragCoord/u_textureDim;

  vec3 lastPosition = texture2D(u_lastPosition, scaledFragCoord).xyz;

  vec2 mass = texture2D(u_mass, scaledFragCoord).xy;
  if (mass[1] == 1.0){//fixed
    gl_FragColor = vec4(lastPosition, 0.0);
    return;
  }
  vec3 force = texture2D(u_externalForces, scaledFragCoord).xyz;
  vec3 lastLastPosition = texture2D(u_lastLastPosition, scaledFragCoord).xyz;
  vec3 lastVelocity = texture2D(u_lastVelocity, scaledFragCoord).xyz;
  vec3 originalPosition = texture2D(u_originalPosition, scaledFragCoord).xyz;

  vec4 neighborIndices = texture2D(u_meta, scaledFragCoord);
  vec4 meta = texture2D(u_meta, scaledFragCoord);
  vec2 meta2 = texture2D(u_meta2, scaledFragCoord).xy;

  float nodeError = 0.0;

  for (int j=0;j<100;j++){//for all beams (up to 100, had to put a const int in here)
    if (j >= int(meta[1])) break;

    vec4 beamMeta = getFromArray(meta[0]+float(j), u_textureDimEdges, u_beamMeta);

    float neighborIndex1D = beamMeta[3];
    vec2 neighborIndex = vec2(mod(neighborIndex1D, u_textureDim.x)+0.5, floor(neighborIndex1D/u_textureDim.x)+0.5);
    vec2 scaledNeighborIndex = neighborIndex/u_textureDim;
    vec3 neighborLastPosition = texture2D(u_lastPosition, scaledNeighborIndex).xyz;
    vec3 neighborLastVelocity = texture2D(u_lastVelocity, scaledNeighborIndex).xyz;
    vec3 neighborOriginalPosition = texture2D(u_originalPosition, scaledNeighborIndex).xyz;

    vec3 deltaP = neighborLastPosition+neighborOriginalPosition-lastPosition-originalPosition;
    float deltaPLength = length(deltaP);
    float nominalLength = beamMeta[2];
    deltaP *= (1.0-nominalLength/deltaPLength);
    nodeError += abs(deltaPLength/nominalLength - 1.0);
    vec3 deltaV = neighborLastVelocity-lastVelocity;

    vec3 _force = deltaP*beamMeta[0] + deltaV*beamMeta[1];
    force += _force;
  }
  nodeError /= meta[1];

  for (int j=0;j<100;j++){//for all creases (up to 100, had to put a const int in here)
    if (j >= int(meta[3])) break;

    vec4 nodeCreaseMeta = getFromArray(meta[2]+float(j), u_textureDimNodeCreases, u_nodeCreaseMeta);

    float creaseIndex1D = nodeCreaseMeta[0];
    vec2 creaseIndex = vec2(mod(creaseIndex1D, u_textureDimCreases.x)+0.5, floor(creaseIndex1D/u_textureDimCreases.x)+0.5);
    vec2 scaledCreaseIndex = creaseIndex/u_textureDimCreases;

    vec4 thetas = texture2D(u_theta, scaledCreaseIndex);
    vec3 creaseMeta = texture2D(u_creaseMeta, scaledCreaseIndex).xyz;//[k, d, targetTheta]
    vec4 creaseGeo = texture2D(u_creaseGeo, scaledCreaseIndex);//[h1, h2, coef1, coef2]
    if (creaseGeo[0]< 0.0) continue;//crease disabled bc it has collapsed too much

    float targetTheta = creaseMeta[2] * u_creasePercent;
    float angForce = creaseMeta[0]*(targetTheta-thetas[0]);// + creaseMeta[1]*thetas[1];

    float nodeNum = nodeCreaseMeta[1];//1, 2, 3, 4

    if (nodeNum > 2.0){//crease reaction, node is on a crease

      //node #1
      vec3 normal1 = getFromArray(thetas[2], u_textureDimFaces, u_normals).xyz;

      //node #2
      vec3 normal2 = getFromArray(thetas[3], u_textureDimFaces, u_normals).xyz;

      float coef1 = creaseGeo[2];
      float coef2 = creaseGeo[3];

      if (nodeNum == 3.0){
        coef1 = 1.0-coef1;
        coef2 = 1.0-coef2;
      }

      vec3 _force = -angForce*(coef1/creaseGeo[0]*normal1 + coef2/creaseGeo[1]*normal2);
      force += _force;

    } else {

      float normalIndex1D = thetas[2];//node #1
      float momentArm = creaseGeo[0];//node #1
      if (nodeNum == 2.0) {
        normalIndex1D = thetas[3];//node #2
        momentArm = creaseGeo[1];//node #2
      }

      vec3 normal = getFromArray(normalIndex1D, u_textureDimFaces, u_normals).xyz;

      vec3 _force = angForce/momentArm*normal;
      force += _force;
    }
  }

  for (int j=0;j<100;j++){//for all faces (up to 100, had to put a const int in here)
    if (j >= int(meta2[1])) break;

    vec4 faceMeta = getFromArray(meta2[0]+float(j), u_textureDimNodeFaces, u_nodeFaceMeta);//[face index, a, b, c]
    vec3 nominalAngles = getFromArray(faceMeta[0], u_textureDimFaces, u_nominalTriangles).xyz;//[angA, angB, angC]

    int faceIndex = 0;
    if (faceMeta[2] < 0.0) faceIndex = 1;
    if (faceMeta[3] < 0.0) faceIndex = 2;

    //get node positions
    vec3 a = faceIndex == 0 ? lastPosition+originalPosition : getPosition(faceMeta[1]);
    vec3 b = faceIndex == 1 ? lastPosition+originalPosition : getPosition(faceMeta[2]);
    vec3 c = faceIndex == 2 ? lastPosition+originalPosition : getPosition(faceMeta[3]);

    //calc angles
    vec3 ab = b-a;
    vec3 ac = c-a;
    vec3 bc = c-b;

    float lengthAB = length(ab);
    float lengthAC = length(ac);
    float lengthBC = length(bc);

    float tol = 0.0000001;
    if (abs(lengthAB) < tol || abs(lengthBC) < tol || abs(lengthAC) < tol) continue;

    ab /= lengthAB;
    ac /= lengthAC;
    bc /= lengthBC;

    vec3 angles = vec3(acos(dot(ab, ac)),
      acos(-1.0*dot(ab, bc)),
      acos(dot(ac, bc)));
    vec3 anglesDiff = nominalAngles-angles;

    vec3 normal = getFromArray(faceMeta[0], u_textureDimFaces, u_normals).xyz;

    //calc forces
    anglesDiff *= u_faceStiffness;
    if (faceIndex == 0){//a
      vec3 normalCrossAC = cross(normal, ac)/lengthAC;
      vec3 normalCrossAB = cross(normal, ab)/lengthAB;
      force -= anglesDiff[0]*(normalCrossAC - normalCrossAB);
      force -= anglesDiff[1]*normalCrossAB;
      force += anglesDiff[2]*normalCrossAC;
    } else if (faceIndex == 1){
      vec3 normalCrossAB = cross(normal, ab)/lengthAB;
      vec3 normalCrossBC = cross(normal, bc)/lengthBC;
      force -= anglesDiff[0]*normalCrossAB;
      force += anglesDiff[1]*(normalCrossAB + normalCrossBC);
      force -= anglesDiff[2]*normalCrossBC;
    } else if (faceIndex == 2){
      vec3 normalCrossAC = cross(normal, ac)/lengthAC;
      vec3 normalCrossBC = cross(normal, bc)/lengthBC;
      force += anglesDiff[0]*normalCrossAC;
      force -= anglesDiff[1]*normalCrossBC;
      force += anglesDiff[2]*(normalCrossBC - normalCrossAC);
    }

  }

  vec3 nextPosition = force*u_dt*u_dt/mass[0] + 2.0*lastPosition - lastLastPosition;
  gl_FragColor = vec4(nextPosition,nodeError);//position.a has error info
}
