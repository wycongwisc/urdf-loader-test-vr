import * as T from 'three';
import URDFLoader from '../urdf-loader';
import { initScene } from './sceneInit';
import * as yaml from 'js-yaml';
import { getURDFFromURL } from './utilities/loaderHelper';
import initRelaxedIK, { RelaxedIK } from "../relaxed_ik_web/pkg/relaxed_ik_web.js";
import { getCurrEEPose } from './utils';

import ThreeMeshUI from 'three-mesh-ui'

import { VrControl } from './vrControl.js'
import { Data } from './Data';
import { UI } from './UI';
import { recurseMaterialTraverse } from './utilities/robotHelper';

import RAPIER from '@dimforge/rapier3d';
// relaxedikDemo();

/**
 * Adds the robot to the scene, sets initial joint values, and initializes RelaxedIK
 * 
 * @param {String} file 
 * @param {String} info 
 * @param {String} nn 
 * @param {Boolean} loadScreen 
 */
function loadRobot(name, file, info, nn, loadScreen = false) {
    const loader = new URDFLoader(loadScreen ? new T.LoadingManager(() => {
        const loadingScreen = document.querySelector('#loading-screen');
        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener('transitionend', (e) => e.target.remove());
    }) : null);

    loader.parseCollision = true;
    loader.parseVisual = true;
    loader.load(file, robot => {
        robot.rotation.x = -Math.PI / 2;
        robot.position.y = .1;
        robot.position.x = .25;
        robot.updateMatrix();
        robot.traverse(c => {
            c.castShadow = true;
            c.recieveShadow = true;
            if (c.type == 'PointLight') {
                c.intensity = 0;
                c.castShadow = false;
                c.distance = 0;
            }
            if (c.material) {
                recurseMaterialTraverse(c.material, (material) => {
                    material.alphaToCoverage = true;
                    material.transparent = true;
                    material.side = T.DoubleSide
                })
            }
        });

        // scene.add(robot);
        window.robot = robot;
        window.robotName = name;
        console.log(robot);

        initRelaxedIK().then(async () => {
            window.robotInfo = yaml.load(await fetch(info).then(response => response.text()));
            window.robotNN = yaml.load(await fetch(nn).then(response => response.text()));

            const joints = Object.entries(window.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
            joints.forEach(joint => {
                const jointIndex = window.robotInfo.joint_ordering.indexOf(joint[0]);
                if (jointIndex != -1) window.robot.setJointValue(joint[0], window.robotInfo.starting_config[jointIndex]);
            })    

            window.relaxedIK = new RelaxedIK(window.robotInfo, window.robotNN);
            console.log('%cSuccessfully loaded robot config.', 'color: green');

            function createRobotCollider(currJoint, parentRigidBody, parentColliders, parentJointRotation, parentName = '') {
                if (![
                    'base_fixed', 
                    'controller_box_fixed', 
                    'display_joint',
                    'finger_tip_joint',
                    'head_camera',
                    'head_pan',
                    'pedestal_feet_fixed', 
                    'pedestal_fixed', 
                    'right_arm_mount', 
                    'right_j0',
                    'right_j1',
                    // 'right_j1_2',
                    // 'right_j2',
                    // 'right_j2_2',
                    // 'right_j3',
                    // 'right_j4',
                    // 'right_j4_2',
                    // 'right_j5',
                    // 'right_j6',
                    // 'right_hand',
                    // 'right_torso_itb',
                    // 'right_wirst',
                    // 'torso_t0',
                    // 'right_gripper_base_joint',
                ].includes(currJoint.name)) return;

                if (currJoint.type === 'URDFJoint' || currJoint.type === 'URDFMimicJoint') {
                    console.log(`%c ${currJoint.name}`, 'background: #222; color: white; padding: .5rem');
                    console.log(currJoint)
                    currJoint.children.forEach((childLink) => {
                        if (childLink.type == 'URDFLink') {
                            const urdfColliders = [];
                            let urdfVisual;
                            childLink.children.forEach((grandChild) => {
                                if (grandChild.type === 'URDFCollider') {
                                    urdfColliders.push(grandChild);
                                } else if (grandChild.type === 'URDFVisual') {
                                    if (!urdfVisual) urdfVisual = grandChild;
                                    else console.warn("Multiple URDF Visual found!");
                                }
                            });
                           
                            // if (!childLink.mass) console.warn('Undefined mass, setting to default value (1.0).');
                            // const mass = childLink.mass ?? 1.0;
    
                            const position = childLink.getWorldPosition(new T.Vector3());
                            const quaternion = childLink.getWorldQuaternion(new T.Quaternion());
                            console.log(childLink.name, position, quaternion);

                            // if (currJoint._jointType === 'revolute' && currJoint.name === "right_j1") {
                            //     // quaternion.multiply(currJoint.quaternion);
                            //     // quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(0, -1.5708, -1.5708, 'XYZ')));
                            //     quaternion.multiply 
                            // }

                            const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
                                .setTranslation(position.x, position.y, position.z)
                                .setRotation(quaternion)
                                .setLinearDamping(0.5)
                                .setAngularDamping(1.0)
                            const rigidBody = world.createRigidBody(rigidBodyDesc);

                            const currentJointRotation = new T.Quaternion();
                            currentJointRotation.multiplyQuaternions(parentJointRotation, currJoint.quaternion)

                            if (urdfVisual) {
                                const visual = urdfVisual.clone();
                                const visualGroup = new T.Group();
                                visualGroup.add(visual);

                                if (currJoint._jointType === 'revolute') {
                                    visual.quaternion.copy(currentJointRotation.clone())
                                }


                                three_to_ros.add(visualGroup);
                                coll2mesh.set(rigidBody, visualGroup);
                            }
    
                            const colliders = [];
                            if (urdfColliders.length != 0) {
                                for (const urdfCollider of urdfColliders) {
                                    const colliderMeshes = [];
                                    urdfCollider.traverse((child) => {
                                        if (child.type === 'Mesh') colliderMeshes.push(child)
                                    })
                                    // let colliderMeshes = recursivelyFindMesh(urdfCollider);
                                    if (colliderMeshes.length != 1) {
                                        console.warn("No collider mesh or multiple collider meshes were found under: ");
                                        console.log(urdfCollider);
                                        return;
                                    } 
        
                                    const colliderMesh = colliderMeshes[0];
                                    const vertices = colliderMesh.geometry.getAttribute('position').array.slice();
                                    console.log(colliderMesh)

                                    for (let i = 0; i < vertices.length; i += 3) {
                                        vertices[i] *= colliderMesh.scale.x;
                                        vertices[i + 1] *= colliderMesh.scale.y;
                                        vertices[i + 2] *= colliderMesh.scale.z;
                                    }

                                    let indices = colliderMesh.geometry.index;
                                    if (!indices) {
                                        // unindexed bufferedgeometry
                                        indices = [...Array(vertices.count).keys()]
                                    }

                                    // The pose of a Rapier collider is relative to the RigidBody its attached to.
                                    // We want the pose of the URDFCollider mesh relative to the corresponding URDFLink/RigidBody
                                    // However, the URDFCollider mesh is relative to URDFCollider (which is then relative to URDFLink), so we compose the transformations
                                    let position = new T.Vector3();
                                    position.addVectors(urdfCollider.position, colliderMesh.position);
                                    let quaternion = new T.Quaternion();
                                    quaternion.multiplyQuaternions(urdfCollider.quaternion, colliderMesh.quaternion);

                                    // console.log('before:', position, quaternion)

                                    // if (currJoint._jointType === 'revolute' && currJoint.name === "right_j1") {
                                    //     // quaternion.multiply(currJoint.quaternion);
                                    //     // quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(0, 1.5708, 0, 'XYZ')));


                                    //     const group = new T.Group();
                                    //     group.add(urdfCollider.clone());
                                    //     group.applyQuaternion(currJoint.quaternion);

                                    //     console.log('after:', group.position, group.quaternion)
                                    // }

                                    // 1. find the axis of rotation in terms of the parent

                                    if (currJoint._jointType === 'revolute') {
                                        const child = new T.Object3D();
                                        child.position.copy(position);
                                        child.quaternion.copy(quaternion);

                                        const parent = new T.Group();
                                        parent.add(child);
                                        parent.quaternion.copy(currentJointRotation.clone());
    
                                        position = child.getWorldPosition(new T.Vector3());
                                        quaternion = child.getWorldQuaternion(new T.Quaternion());

                                        console.log(childLink.name, position, quaternion)
                                    }

                                    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices.array)
                                        .setTranslation(position.x, position.y, position.z)
                                        .setRotation(quaternion)
                                        .setDensity(5)
                                    colliders.push(world.createCollider(colliderDesc, rigidBody));
                                }
                            }
    
                            if (currJoint._jointType === 'fixed') {
                                if (colliders.length != 0) {
                                    // const parentGroups_membership  =  parentColliders[0].collisionGroups() >> 16;
                                    for (const collider of colliders) {
                                        // collider.setCollisionGroups((parentGroups_membership << 16) | ( 0xffff & (0xffff ^ parentGroups_membership)));
                                        collider.setCollisionGroups(robotCollisionGroups)
                                    }
                                }

                                console.log('Creating a fixed joint between ' + parentName + ' and ' +  childLink.name);


                                const position = currJoint.position.clone().applyQuaternion(parentJointRotation);
                                const quaternion = new T.Quaternion().multiplyQuaternions(currJoint.quaternion, parentJointRotation);
                                

                                // These are transformations relative to the parentRigidBody and rigidBody respectively. 
                                // The position and orientation for rigidBody are unchanged because the second link/rigidBody of a joint is located at the joint (by THREE convention)
                                const jointParams = RAPIER.JointData.fixed(
                                    new RAPIER.Vector3(position.x, position.y, position.z), 
                                    new RAPIER.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w), 
                                    new RAPIER.Vector3(0.0, 0.0, 0.0), 
                                    new RAPIER.Quaternion(0.0, 0.0, 0.0, 1.0)
                                );
                                world.createImpulseJoint(jointParams, parentRigidBody, rigidBody);
                            } 
                            
                            else if (currJoint._jointType === 'revolute') {
                                if (colliders.length != 0) {
                                    // currCollisionGroup_membership *= 2;
                                    // const parentGroups_membership = parentCollider.collisionGroups() >> 16;
                                    // const parentGroups_filter = parentCollider.collisionGroups() & 0xffff;
                                    // collider.setCollisionGroups( (currCollisionGroup_membership << 16) | ( 0xffff & (0xffff ^ (parentGroups_membership | currCollisionGroup_membership))));
                                    // parentCollider.setCollisionGroups( (parentGroups_membership << 16) | (parentGroups_filter & ( parentGroups_filter ^ currCollisionGroup_membership)));

                                    for (const collider of colliders) {
                                        collider.setCollisionGroups(robotCollisionGroups)
                                    }

                                    for (const collider of parentColliders) {
                                        collider.setCollisionGroups(robotCollisionGroups)
                                    }
                                }

                                console.log('Creating a revolute joint between ' + parentName + ' and ' +  childLink.name + ' with axis ', currJoint.axis);

                                const axis = currJoint.axis.clone().applyQuaternion(currentJointRotation)
                                const position = currJoint.position.clone().applyQuaternion(parentJointRotation);
                        
                                let params = RAPIER.JointData.revolute(
                                    new RAPIER.Vector3(position.x, position.y, position.z), 
                                    new RAPIER.Vector3(0.0, 0.0, 0.0), 
                                    new RAPIER.Vector3(axis.x, axis.y, axis.z)
                                );

                                const joint = world.createImpulseJoint(params, parentRigidBody, rigidBody);
                                jointNames.set(currJoint.name, joint);
                                // joint.configureMotorVelocity(0, 0.5);

                            } else {
                                console.log(currJoint._jointType);
                            }
                            childLink.children.forEach((joint) => {
                                createRobotCollider(joint, rigidBody, colliders, currentJointRotation.clone(), childLink.name);
                            });
                        }
                    })
                } 
            }

            // console.log('Robot: ', robot);
    
            // const jointNames = new Map();


            // const position = robot.getWorldPosition(new T.Vector3());
            // const quaternion = robot.getWorldQuaternion(new T.Quaternion());
            // console.log(robot.name);
            // const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            //     .setTranslation(position.x, position.y, position.z)
            //     .setRotation(quaternion);
            // const rigidBody = world.createRigidBody(rigidBodyDesc);

            // robot.children.forEach((joint) => {
            //     createRobotCollider(joint, rigidBody, [], new T.Quaternion());
            // });
    
            // function changeRobotVisibility(parent, hideURDFVisual, hideURDFCollider) {
            //     parent.children.forEach( (child) => {
            //         if (child.type === 'URDFCollider') {
            //             if (hideURDFCollider === true) {
            //                 child.visible = false; 
            //             } else {
            //                 child.visible = true; 
            //             }
            //         } else  if (child.type === 'URDFVisual') {
            //             if (hideURDFVisual === true) {
            //                 child.visible = false; 
            //             } else {
            //                 child.visible = true; 
            //             }
            //         } else {
            //             changeRobotVisibility(child, hideURDFVisual, hideURDFCollider);
            //         }
            //     })
            // }
    
            // changeRobotVisibility(window.robot, true, false);

            init();
        });



    });
}

///////////////////////////////////////////////////////////

const [scene, camera, renderer, camControls] = initScene();
window.scene = scene;
window.camera = camera;

// const gravity = { x: 0.0, y: -9.81, z: 0.0 };
// const world = new RAPIER.World(gravity);

// const groundDesc = RAPIER.RigidBodyDesc.fixed()
// const groundRigidBody = world.createRigidBody(groundDesc);
// let currCollisionGroup_membership = 0x0001;
// const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0).setDensity(2.0);
// const groundCollider = world.createCollider(groundColliderDesc, groundRigidBody);
// const robotCollisionGroups = 0x00010002;
// const groundCollisionGroups = 0x00020001;

// // groundCollider.setCollisionGroups( currCollisionGroup_membership << 16 | (0xffff & (0xffff ^ currCollisionGroup_membership)));
// groundCollider.setCollisionGroups(groundCollisionGroups);

const gravity = { x: 0.0, y: -9.8, z: 0.0 };
  const world = new RAPIER.World(gravity);

  const groundDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0.0, -0.1, 0.0);
  const groundRigidBody = world.createRigidBody(groundDesc);
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0).setDensity(2.0);
  const groundCollider = world.createCollider(groundColliderDesc, groundRigidBody);
  
  const object1RigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  const object1RigidBody = world.createRigidBody(object1RigidBodyDesc);
  const object1ColliderDesc = RAPIER.ColliderDesc.cuboid(0.1, 0.1, 0.1).setDensity(1.3).setFriction(0.8);
  const object1Collider = world.createCollider(object1ColliderDesc, object1RigidBody);

  const object1JointParams = RAPIER.JointData.fixed(
    new RAPIER.Vector3(0.0, 1.0, 0.0), 
    new RAPIER.Quaternion(-0.7071068, 0, 0, 0.7071068),
    new RAPIER.Vector3(0.0, 0.0, 0.0), 
    new RAPIER.Quaternion(0.0,0.0, 0.0, 1.0)
  );
  const j0 = world.createImpulseJoint(object1JointParams, groundRigidBody, object1RigidBody);

  const object2RigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  const object2RigidBody = world.createRigidBody(object2RigidBodyDesc);
  const object2ColliderDesc = RAPIER.ColliderDesc.cuboid(0.1, 0.1, 0.1).setDensity(1.3).setFriction(0.8);
  const object2Collider = world.createCollider(object2ColliderDesc, object2RigidBody);

  const object2JointParams = RAPIER.JointData.revolute(
    new RAPIER.Vector3(0.0, 0.0, 0.5), 
    new RAPIER.Vector3(0.0, 0.0, 0.0),  
    new RAPIER.Vector3(0.0, 0.0, 1.0),  
  );
  const j1 = world.createImpulseJoint(object2JointParams, object1RigidBody, object2RigidBody);
	// j1.configureMotorVelocity(-10, 0.5)
  
  // the revolute joint shouldn't be rotating
	j1.configureMotorPosition(1, 1, 0.02)

const coll2mesh = new Map();
const three_to_ros = new T.Group();
scene.add(three_to_ros);

let lines;
const gameLoop = () => {
    world.step();

    coll2mesh.forEach((mesh, rigidBody) => {
        const position = rigidBody.translation();
        mesh.position.set(position.x, position.y, position.z);
        const quaternion = rigidBody.rotation();
        mesh.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        // console.log(position, quaternion);
        mesh.updateMatrix();
    })


    if (!lines) {
        let material = new T.LineBasicMaterial({
            color: 0xffffff,
            vertexColors: T.VertexColors
        });
        let geometry = new T.BufferGeometry();
        lines = new T.LineSegments(geometry, material);
        lines.renderOrder = Infinity;
        lines.material.depthTest = false;
        lines.material.depthWrite = false;
        scene.add(lines);
    }
    
    let buffers = world.debugRender();
    lines.geometry.setAttribute('position', new T.BufferAttribute(buffers.vertices, 3));
    lines.geometry.setAttribute('color', new T.BufferAttribute(buffers.colors, 4));


    setTimeout(gameLoop, 16);
};

gameLoop();

// load robots

const robots = {
    sawyer: {
        info: 'https://raw.githubusercontent.com/uwgraphics/relaxed_ik_core/collision-ik/config/info_files/sawyer_info.yaml',
        nn: 'https://raw.githubusercontent.com/uwgraphics/relaxed_ik_core/collision-ik/config/collision_nn_rust/sawyer_nn.yaml'
    },
    ur5: {}
}

getURDFFromURL("https://raw.githubusercontent.com/wycongwisc/robot-files/master/sawyer_description/urdf/sawyer_gripper.urdf", (blob) => {
    robots.sawyer.file = URL.createObjectURL(blob);
    loadRobot('sawyer', robots.sawyer.file, robots.sawyer.info, robots.sawyer.nn, true);
})

getURDFFromURL("https://raw.githubusercontent.com/yepw/robot_configs/master/ur5_description/urdf/ur5_gripper.urdf", (blob) => {
    robots.ur5.file = URL.createObjectURL(blob);
})

function init() {

    document.querySelector('#toggle-physics').onclick = function() {
        if (lines.parent === scene) scene.remove(lines)
        else scene.add(lines)
    }
    
    document.querySelector('#toggle-robot').onclick = function() {
        if (window.robot.parent === scene) scene.remove(window.robot)
        else scene.add(window.robot)
    }


    const data = new Data();

    const ui = new UI();

    const vrControl = new VrControl({
        camera,
        renderer,
        data,
        ui,
    })


    // const geometry = new T.SphereGeometry(1, 32, 16);
    // const material = new T.MeshStandardMaterial({ color: 0xffff00 });
    // const sphere = new T.Mesh(geometry, material);
    // sphere.castShadow = true;
    // scene.add(sphere);

    // Use the RAPIER module here.
    // const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    // const world = new RAPIER.World(gravity);

    // // Create the ground
    // let groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0);
    // world.createCollider(groundColliderDesc);
  
    // // Create a dynamic rigid-body.
    // let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    // rigidBodyDesc.setTranslation(0.0, 3.0, 0.0);
    // let rigidBody = world.createRigidBody(rigidBodyDesc);
  
    // // Create a cuboid collider attached to the dynamic rigidBody.
    // let colliderDesc = RAPIER.ColliderDesc.ball(1)
    // colliderDesc.setRestitution(0.8)
    // let collider = world.createCollider(colliderDesc, rigidBody);




    // update loop

    setTimeout(function update() { 
        if (renderer.xr.isPresenting) {
            // pass timestamp to ensure tables can be joined by timestamp
            // only update and log data if user is in VR
            const t = Date.now();
            vrControl.update(t);
            vrControl.log(t);
        }
        setTimeout(update, 5);
    }, 5);

    // render loop

    renderer.setAnimationLoop( function () {
        ThreeMeshUI.update();
        vrControl.teleportvr?.update();
        renderer.render(scene, camera);
    });
}