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
    // loader.parseInertial = true;
    loader.load(file, robot => {
        robot.rotation.x = -Math.PI / 2;
        robot.position.y = .05;
        robot.position.x = .2 ;
        // robot.position.z = .3;
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

        window.robotColliders = {};
        window.gripperColliders = [];

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


            window.linkToRigidBody = new Map();

            function initRobotPhysics(currJoint) {
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
    
                            const position = childLink.getWorldPosition(new T.Vector3());
                            const quaternion = childLink.getWorldQuaternion(new T.Quaternion());

                            const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
                                .setTranslation(position.x, position.y, position.z)
                                .setRotation(quaternion)
                            const rigidBody = world.createRigidBody(rigidBodyDesc);

                            if (urdfVisual) {
                                urdfVisual.traverse(child => {
                                    child.castShadow = true;
                                    child.recieveShadow = true;
                                })
                                const visualGroup = new T.Group();
                                visualGroup.add(urdfVisual);
                                scene.add(visualGroup);
                                simObjs.set(rigidBody, visualGroup);
                            }
    
                            if (urdfColliders.length != 0 && childLink.name !== 'finger_tip') {
                                const colliders = [];
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
                                    let position = new T.Vector3();
                                    position.addVectors(urdfCollider.position, colliderMesh.position);
                                    let quaternion = new T.Quaternion();
                                    quaternion.multiplyQuaternions(urdfCollider.quaternion, colliderMesh.quaternion);


                                    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices.array)
                                        .setTranslation(position.x, position.y, position.z)
                                        .setRotation(quaternion)
                                    const collider = world.createCollider(colliderDesc, rigidBody);
                                    collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
                                    colliders.push(collider);
                                }
                                window.robotColliders[childLink.name] = colliders;
                            }

                            if (childLink.name === 'right_gripper_l_finger') {
                                window.leftFinger =  {
                                    rigidBody,
                                    link: childLink
                                }
                            }
                            if (childLink.name === 'right_gripper_r_finger') {
                                window.rightFinger =  {
                                    rigidBody,
                                    link: childLink
                                }
                            }
                            window.linkToRigidBody.set(childLink, rigidBody);
                            childLink.children.forEach((joint) => {
                                initRobotPhysics(joint);
                            });
                        }
                    })
                } 
            }


            const position = robot.getWorldPosition(new T.Vector3());
            const quaternion = robot.getWorldQuaternion(new T.Quaternion());
            const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(position.x, position.y, position.z)
                .setRotation(quaternion);
            const rigidBody = world.createRigidBody(rigidBodyDesc);

            robot.children.forEach((joint) => {
                initRobotPhysics(joint)
            });
    
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
const groundCollider = world.createCollider(groundColliderDesc, groundRigidBody);
const robotCollisionGroups = 0x00010002;
const groundCollisionGroups = 0x00020001;
groundCollider.setCollisionGroups(groundCollisionGroups);

window.simObjs = new Map();

// load robots

const robots = {
    sawyer: {
        info: 'https://raw.githubusercontent.com/uwgraphics/relaxed_ik_core/collision-ik/config/info_files/sawyer_info.yaml',
        nn: 'https://raw.githubusercontent.com/uwgraphics/relaxed_ik_core/collision-ik/config/collision_nn_rust/sawyer_nn.yaml'
    },
    ur5: {
        info: "https://raw.githubusercontent.com/yepw/robot_configs/master/info_files/ur5_gripper_info.yaml",
        nn: "https://raw.githubusercontent.com/yepw/robot_configs/master/collision_nn_rust/ur5_nn.yaml"
    }
}

getURDFFromURL("https://raw.githubusercontent.com/wycongwisc/robot-files/master/sawyer_description/urdf/sawyer_gripper.urdf", (blob) => {
    robots.sawyer.file = URL.createObjectURL(blob);
    loadRobot('sawyer', robots.sawyer.file, robots.sawyer.info, robots.sawyer.nn, true);
})

getURDFFromURL("https://raw.githubusercontent.com/yepw/robot_configs/master/ur5_description/urdf/ur5_gripper.urdf", (blob) => {
    robots.ur5.file = URL.createObjectURL(blob);
    // loadRobot('ur5', robots.ur5.file, robots.ur5.info, robots.ur5.nn, true);
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
        world,
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




    // update logic loop
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


    // update physics loop
    let lines;
    setTimeout(function update() {
        const events = new RAPIER.EventQueue(true);
        world.step(events);

        // vrControl.updatePhysics(events);
        window.simObjs.forEach((mesh, rigidBody) => {
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

        setTimeout(update, 16);
    })

    // render loop
    renderer.setAnimationLoop( function () {
        ThreeMeshUI.update();
        vrControl.teleportvr?.update();
        renderer.render(scene, camera);
    });
}