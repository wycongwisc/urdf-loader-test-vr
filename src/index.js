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

    // loader.parseCollision = true;
    // loader.parseVisual = true;
    loader.load(file, robot => {
        robot.rotation.x = -Math.PI / 2;
        robot.position.y = 0.02;
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

        scene.add(robot);
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

            function createRobotCollider(currJoint, parentRigidBody, parentCollider) {
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
                           
                            if (!childLink.mass) console.warn('Undefined mass, setting to default value (1.0).');
                            const mass = childLink.mass ?? 1.0;
    
                            const position = childLink.getWorldPosition(new T.Vector3());
                            const quaternion = childLink.getWorldQuaternion(new T.Quaternion());
                            const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setAdditionalMass(mass).setTranslation(position.x, position.y, position.z).setRotation(quaternion);
                            const rigidBody = world.createRigidBody(rigidBodyDesc);

                            if (urdfVisual) {
                                const visual = urdfVisual.clone();
                                const visualGroup = new T.Group();
                                visualGroup.add(visual);
                                three_to_ros.add(visualGroup);
                                coll2mesh.set(rigidBody, visualGroup);
                            }
    
                            let collider = undefined;
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
                                        vertices[i] = vertices[i] * colliderMesh.scale.x;
                                        vertices[i + 1] = vertices[i + 1] * colliderMesh.scale.y;
                                        vertices[i + 2] = vertices[i + 2] * colliderMesh.scale.z;
                                    }

                                    let indices = colliderMesh.geometry.index;
                                    if (!indices) {
                                        // unindexed bufferedgeometry
                                        indices = [...Array(vertices.count).keys()]
                                    }

                                    const position = new T.Vector3();
                                    position.addVectors(urdfCollider.position, colliderMesh.position);
                                    const quaternion = new T.Quaternion();
                                    quaternion.multiplyQuaternions(urdfCollider.quaternion, colliderMesh.quaternion);

                                    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices.array).setTranslation(position.x, position.y, position.z).setRotation(quaternion);
                                    collider = world.createCollider(colliderDesc, rigidBody);
                                }
                            }
    
                            if (currJoint._jointType === 'fixed') {
                                if (collider) {
                                    let parentGroups_membership  =  parentCollider.collisionGroups() >> 16;
                                    collider.setCollisionGroups( (parentGroups_membership << 16) | ( 0xffff & (0xffff ^ parentGroups_membership)));
                                }
    
                                const position = currJoint.position;
                                const quaternion = currJoint.quaternion;
                                // TODO: take care of orientation in URDF
    
                                const jointParams = RAPIER.JointData.fixed(
                                    new RAPIER.Vector3(position.x, position.y, position.z), 
                                    new RAPIER.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w), 
                                    new RAPIER.Vector3(0.0, 0.0, 0.0), 
                                    new RAPIER.Quaternion(0.0, 0.0, 0.0, 1.0)
                                );
                                world.createImpulseJoint(jointParams, parentRigidBody, rigidBody);
    
                                childLink.children.forEach((joint) => {
                                    createRobotCollider(joint, rigidBody, parentCollider);
                                });
                            } else if (currJoint._jointType === 'revolute') {
                                if (collider) {
                                    currCollisionGroup_membership *= 2;
                                    const parentGroups_membership = parentCollider.collisionGroups() >> 16;
                                    const parentGroups_filter = parentCollider.collisionGroups() & 0xffff;
                                    collider.setCollisionGroups( (currCollisionGroup_membership << 16) | ( 0xffff & (0xffff ^ (parentGroups_membership | currCollisionGroup_membership))));
                                    parentCollider.setCollisionGroups( (parentGroups_membership << 16) | (parentGroups_filter & ( parentGroups_filter ^ currCollisionGroup_membership)));
                                }
    
                                const position = currJoint.position;
                                const quaternion = currJoint.quaternion;
                                // TODO: take care of orientation in URDF
                                const anchor1 = new RAPIER.Vector3( position.x, position.y, position.z);
                                const axis = new RAPIER.Vector3( currJoint.axis.x, currJoint.axis.y, currJoint.axis.z);
    
                                const params = RAPIER.JointData.revolute(anchor1, new RAPIER.Vector3( 0.0, 0.0, 0.0), axis);
                                const joint = world.createImpulseJoint(params, parentRigidBody, rigidBody);
                                // jointNames.set(currJoint.name, rapier_joint);

                                // console.log(rapier_joint)
                                // console.log(rapier_joint.rawSet.jointConfigureMotorVelocity())
                                // console.log(rapier_joint.rawAxis())
    
                                joint.rawSet.jointConfigureMotorVelocity(joint.handle, joint.rawAxis(), 1.0, 0.5)
    
                                childLink.children.forEach( (joint) => {
                                    createRobotCollider(joint, rigidBody, collider);
                                });
                            } else {
                                console.log(currJoint._jointType);
                            }
                        }
                    })
                } 
            }
    
            // console.log('Robot: ', robot);
    
            // const jointNames = new Map();
            // robot.children.forEach((joint) => {
            //     createRobotCollider(joint, groundRigidBody, groundCollider);
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

const gravity = { x: 0.0, y: -9.81, z: 0.0 };
const world = new RAPIER.World(gravity);

const groundDesc = RAPIER.RigidBodyDesc.fixed()
const groundRigidBody = world.createRigidBody(groundDesc);
let currCollisionGroup_membership = 0x0001;
const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0).setDensity(2.0);
const groundCollider = world.createCollider(groundColliderDesc, groundRigidBody.handle);
groundCollider.setCollisionGroups( currCollisionGroup_membership << 16 | (0xffff & (0xffff ^ currCollisionGroup_membership)));

// const coll2mesh = new Map();
// const three_to_ros = new T.Group();
// scene.add(three_to_ros);

// let lines;
// const gameLoop = () => {
//     world.step();

//     // Get and print the rigid-body's position.
//     // const position = rigidBody.translation();
//     // console.log("Rigid-body position: ", position.x, position.y, position.z);

//     // coll2mesh.forEach((mesh, rigidBody) => {
//     //     const position = rigidBody.translation();
//     //     mesh.position.set(position.x, position.y, position.z);
//     //     const rotation = rigidBody.rotation();
//     //     mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
//     //     mesh.updateMatrix();
//     // })


//     if (!lines) {
//         let material = new T.LineBasicMaterial({
//             color: 0xffffff,
//             vertexColors: T.VertexColors
//         });
//         let geometry = new T.BufferGeometry();
//         lines = new T.LineSegments(geometry, material);
//         lines.renderOrder = Infinity;
//         lines.material.depthTest = false;
//         lines.material.depthWrite = false;
//         scene.add(lines);
//     }
    
//     let buffers = world.debugRender();
//     lines.geometry.setAttribute('position', new T.BufferAttribute(buffers.vertices, 3));
//     lines.geometry.setAttribute('color', new T.BufferAttribute(buffers.colors, 4));


//     setTimeout(gameLoop, 16);
// };

// gameLoop();

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
            // initialize timestamp here to ensure tables can be joined by timestamp
            const t = Date.now();
            vrControl.update(t);

            // log updated data
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

