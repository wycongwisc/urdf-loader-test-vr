import * as T from 'three';
import URDFLoader from 'urdf-loader';
import { initScene } from './sceneInit';
import { getURDFFromURL } from './robotFunctions/loaderHelper';
import { createButton, createSlider, createCanvas, createText, createToggleSwitch, createBr, createSelect } from './ui/inputAdders';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import { MouseControl } from './mouseControl.js';
import { VrControl } from './vrControl.js'

import init, {RelaxedIK} from "../relaxed_ik_web/pkg/relaxed_ik_web.js";
import * as yaml from 'js-yaml';
import { getCurrEEpose, recursiveSearch } from './utils';
import { ControlMapping} from './controlMapping';
import { chainDependencies, create } from 'mathjs';

import ThreeMeshUI from 'three-mesh-ui'

import { TaskControl } from './taskControl.js'
import { DataControl } from './dataControl';
import { UiControl } from './uiControl';
import TeleportVR from 'teleportvr';

export async function relaxedikDemo() {

    const [scene, camera, renderer, camControls] = initScene();

    window.robot = {};
    let jointSliders = [];

    const dataControl = new DataControl();
    window.dataControl = dataControl;

    const teleportVR = new TeleportVR(scene, camera);

    const gridHelper = new T.GridHelper( 10, 20, 0x121A21, 0x121A21 )
    scene.add( gridHelper );

    getURDFFromURL("https://raw.githubusercontent.com/wycongwisc/robot-files/master/sawyer_description/urdf/sawyer_gripper.urdf", (blob) => {
        window.sawyerRobotFile = URL.createObjectURL(blob)
        window.loadRobot(window.sawyerRobotFile);
        window.currentRobot = 'sawyer'
    });

    getURDFFromURL("https://raw.githubusercontent.com/yepw/robot_configs/master/ur5_description/urdf/ur5_gripper.urdf", (blob) => {
        window.ur5RobotFile = URL.createObjectURL(blob)
    });

    // getURDFFromURL("./models/Tables_and_Knobs/urdf/tables_and_knobs_scene.urdf", (blob) => {
    //     loadScene(URL.createObjectURL(blob))
    // });

    const loadingManager = new T.LoadingManager(() => {
        console.log('fade')
        const loadingScreen = document.querySelector('#loading-screen');
        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener( 'transitionend', (event) => {
            event.target.remove();
        });
    })

    // createText("How to control:", "inputs", "h3");

    // createText("1. Click the red dot below.", "inputs", "p");
    // createText("2. Move your mouse to control the robot.", "inputs", "p");
    // createText("3. Scroll mouse wheel to move the robot up and down.", "inputs", "p");
    // createText("4. Right-click to switch to rotation mode.", "inputs", "p");
    // createText("5. Press the ESC button on your keyboard to unlock your cursor.", "inputs", "p");

    // createBr("inputs");
    // createBr("inputs");

    // createText("Task Options:", "inputs", "h3");
    // createText("Warning: changing task settings will reset the task", "inputs", "p");
    // createToggleSwitch("randomize-target-size", "inputs", "", "Randomize Target Size", false);
    // createToggleSwitch("randomize-block-size", "inputs", "", "Randomize Block Size", false);
    // createToggleSwitch("randomize-target-position", "inputs", "", "Randomize Target Position", false);
    // createToggleSwitch("randomize-block-position", "inputs", "", "Randomize Block Position", false);
    // createToggleSwitch("moving-target", "inputs", "", "Moving Target", false);
    // createToggleSwitch("moving-block", "inputs", "", "Moving Block", false);

    // createBr("inputs");
    // createBr("inputs");

    // createText("VR Options:", "inputs", "h3");
    // createToggleSwitch ("stereo", "inputs", "Mono", "Stereo", true);
    // createToggleSwitch ("parallax", "inputs", "No Parallax", "Parallax", true);

    // createBr("inputs");
    // createBr("inputs");

    createText("Options:", "inputs", "h3");
    createToggleSwitch ("cursor-or-robot", "inputs", "Move robot", "Move cursor", true);
    createToggleSwitch ("show-cursor", "inputs", "Hide cursor", "Show cursor", true);

    createCanvas("mouse-control", "bottomDiv");

    let meaningful_axes = [ 'Robot right', 
                            'Robot forward', 
                            'World up', 
                            'Camera up', 
                            'Camera right',
                            'Farther away w.r.t to camera',
                            'Cross product of world up and camera right',
                            'End-effector x-axis',
                            'End-effector y-axis',
                            'End-effector forward',
                            'Camera right projects to ground',
                            'Camera up projects to ground',
                            'Camera right projects to wrist plane',
                            'Camera up projects to wrist plane'];

    let controlMapping = new ControlMapping([]);
     
    let controlMappingSelect = createSelect("control-mappings", "Common control mappings", "inputs", [
        'Robot frame',
        'Camera frame',
        'Camera right + world up',
        'Camera projects to ground plane',
        'Camera projects to wrist plane',
        'Custom combinations'
    ]);

    let mouseRightSelect = createSelect("mouse-right", "Mouse right maps to", "inputs", meaningful_axes);
    mouseRightSelect.onchange = function(user_change) {
        controlMapping.directions[0] = mouseRightSelect.value;
        if (user_change)
            controlMappingSelect.value = "Custom combinations";
    }
    let mouseForwardSelect = createSelect("mouse-forward", "Mouse forward maps to", "inputs", meaningful_axes);
    mouseForwardSelect.onchange = function(user_change) {
        controlMapping.directions[1] = mouseForwardSelect.value;
        if (user_change)
            controlMappingSelect.value = "Custom combinations";
    }
    let mouseWheelSelect = createSelect("mouse-wheel", "Mouse wheel maps to", "inputs", meaningful_axes);
    mouseWheelSelect.onchange = function(user_change) {
        controlMapping.directions[2] = mouseWheelSelect.value;
        if (user_change)
            controlMappingSelect.value = "Custom combinations";
    }

    controlMappingSelect.onchange = function() {
        switch (controlMappingSelect.value) {
            case 'Custom combinations':
                break;
            case 'Camera frame':
                mouseRightSelect.value = "Camera right";
                mouseRightSelect.onchange(false);
                mouseForwardSelect.value = "Camera up";
                mouseForwardSelect.onchange(false);
                mouseWheelSelect.value = "Farther away w.r.t to camera";
                mouseWheelSelect.onchange(false);
                break;
            case 'Camera right + world up':
                mouseRightSelect.value = "Camera right";
                mouseRightSelect.onchange(false);
                mouseForwardSelect.value = "World up";
                mouseForwardSelect.onchange(false);
                mouseWheelSelect.value = "Cross product of world up and camera right";
                mouseWheelSelect.onchange(false);
                break;
            case 'Camera projects to ground plane':
                mouseRightSelect.value = "Camera right projects to ground";
                mouseRightSelect.onchange(false);
                mouseForwardSelect.value = "Camera up projects to ground";
                mouseForwardSelect.onchange(false);
                mouseWheelSelect.value = "World up";
                mouseWheelSelect.onchange(false);
                break;
            case 'Camera projects to wrist plane':
                mouseRightSelect.value = "Camera right projects to wrist plane";
                mouseRightSelect.onchange(false);
                mouseForwardSelect.value = "Camera up projects to wrist plane";
                mouseForwardSelect.onchange(false);
                mouseWheelSelect.value = "End-effector forward";
                mouseWheelSelect.onchange(false);
                break;
            case 'Robot frame':
            default:
                mouseRightSelect.value = "Robot right";
                mouseRightSelect.onchange();
                mouseForwardSelect.value = "Robot forward";
                mouseForwardSelect.onchange();
                mouseWheelSelect.value = "World up";
                mouseWheelSelect.onchange();
        }
    }

    controlMappingSelect.value = "Robot frame";
    controlMappingSelect.onchange();

    // transformation from ROS' reference frame to THREE's reference frame
    const T_ROS_to_THREE = new T.Matrix4().makeRotationFromEuler(new T.Euler(1.57079632679, 0., 0.));
    // transformation from THREE' reference frame to ROS's reference frame
    const T_THREE_to_ROS = T_ROS_to_THREE.clone().invert();

    function onCamMove() {
        const m4 = T_ROS_to_THREE.clone().multiply( camera.matrixWorld.clone());
        const m3 = new T.Matrix3().setFromMatrix4(m4);
        controlMapping.updateCamPose(m3);
    }

    camControls.addEventListener('change',onCamMove);

    onCamMove();

    const geometry = new T.SphereGeometry( 0.015, 32, 32 );
    const material = new T.MeshBasicMaterial( {color: 0xFFFFFF} );
    const target_cursor = new T.Mesh( geometry, material );
    target_cursor.renderOrder = Infinity;
    target_cursor.material.depthTest = false;
    target_cursor.material.depthWrite = false;
    //target_cursor.onBeforeRender = function (renderer) { renderer.clearDepth(); }
    scene.add( target_cursor );

    window.loadRobot = (robotFile) => {
        const loader = new URDFLoader(loadingManager);
        loader.load(robotFile, result => {
            window.robot = result;
            scene.add(window.robot);
            window.robot.rotation.x = -Math.PI / 2;
            window.robot.position.y = 0.02;
            window.robot.position.x = .25;
            window.robot.traverse(c => {
                c.castShadow = true;
                if (c.material) {
                    c.material.alphaToCoverage = true;
                }
            });

            let jointArr = Object.entries(window.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
            jointArr.forEach(joint => {
                let slider = createSlider(joint[0], "joints", joint[1].limit.lower, joint[1].limit.upper, 0.01, joint[1].jointValue[0]);

                slider[0].oninput = () => {
                    slider[1].innerHTML = joint[0] + ": " + String(slider[0].value);
                    window.robot.setJointValue(joint[0], slider[0].value);
                }
                jointSliders.push(slider);
            })

            init().then( () => {
                load_config();
            });
        });
    }

    // const loadScene = (urdfScene) => {
    //     const manager = new T.LoadingManager();
    //     const loader = new URDFLoader(manager);
    //     loader.load(urdfScene, result => {
    //         window.urdfScene = result;
    //     });
    //     manager.onLoad = () => {
    //         scene.add(window.urdfScene);
    //         window.urdfScene.rotation.x = -Math.PI / 2;
    //         window.urdfScene.scale.x = 0.61;
    //         window.urdfScene.scale.y = 0.61;
    //         window.urdfScene.scale.z = 0.61;
    //     }
    // }

    async function load_config() {
        console.log("loading robot config");
        let robot_info = yaml.load(await fetch("https://raw.githubusercontent.com/uwgraphics/relaxed_ik_core/collision-ik/config/info_files/sawyer_info.yaml").then(response => response.text()));
        let robot_nn_config = yaml.load(await fetch("https://raw.githubusercontent.com/uwgraphics/relaxed_ik_core/collision-ik/config/collision_nn_rust/sawyer_nn.yaml").then(response => response.text()));

        // move robot to init config
        let jointArr = Object.entries(window.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
        jointArr.forEach( joint => {
            let i = robot_info.joint_ordering.indexOf(joint[0]);
            if (i != -1) {
                joint[1].jointValue[0] =  robot_info.starting_config[i];
                let slider = jointSliders.find(element => element[0].id.trim() == `${joint[0]}-slider`);
                slider[0].value = joint[1].jointValue[0];
                slider[1].innerHTML = joint[0] + ": " + String(slider[0].value);
                slider[0].oninput();
            }
        })    

        const relaxedIK = new RelaxedIK(robot_info, robot_nn_config);
        
        // TODO: use traverse() instead
        const gripper = recursiveSearch(window.robot, 'children', 'right_gripper_base')[0].clone();

        // clone() does not make a deep copy of material, need to do that here
        gripper.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material instanceof Array ? 
                    child.material.map((material) => material.clone()) : 
                    child.material.clone();
            }
        });

        const uiControl = new UiControl({
            scene,
        })

        const mouseControl = new MouseControl({
            relaxedIK,
            jointSliders,
            robot_info,
            target_cursor,
            controlMapping
        });

        const vrControl = new VrControl({
            camera,
            renderer,
            scene,
            relaxedIK,
            robot_info,
            target_cursor,
            controlMapping,
            dataControl,
            uiControl,
            teleportVR
        })

        const taskControl = new TaskControl({ 
            scene, 
            camera,
            uiControl,
            gripper, 
            dataControl,
            vrControl,
            target_cursor
        });

        let data = [];


        // remove mouse control 
        setTimeout(function update(){ 
            // onsole.log(Date.now());

            const curr_ee_abs_three = getCurrEEpose();

            let updated;
            if (renderer.xr.isPresenting) {
                updated = vrControl.update()
            } else {
                updated = mouseControl.step()
            }

            if (updated) {
                let m4 = T_ROS_to_THREE.clone().multiply( new T.Matrix4().makeRotationFromQuaternion(curr_ee_abs_three.ori));
                let m3 = new T.Matrix3().setFromMatrix4(m4);
                controlMapping.updateEEPose(m3);
            } 

            const timestamp = Date.now();
            taskControl.update(curr_ee_abs_three, timestamp);

            if (renderer.xr.isPresenting) {
                vrControl.log(timestamp);
            }

            // add a log() method for taskControl

            const row = [timestamp, window.currentRobot, vrControl.state.state];
            for (const joint of ["right_j0", "right_j1", "right_j2", "right_j3", "right_j4", "right_j5", "right_j6"]) {
                const currJoint = window.robot.joints[joint];
                // row.push(currJoint.position.x + ' ' + currJoint.position.y + ' ' + currJoint.position.z + ', ' + currJoint.quaternion.x + ' ' + currJoint.quaternion.y + ' ' + currJoint.quaternion.z + ' ' + currJoint.quaternion.w);
                row.push(currJoint.jointValue[0])
            }
            data.push(row);

            // POST request every 500 * 5 = 2500 ms
            if (data.length === 500) {
                dataControl.post(data, {
                    type: 'robot'
                });
                data = [];
            }
            setTimeout(update, 5);
        }, 5);

    }

    // function render() {
    //     renderer.render(scene, camera);

    //     requestAnimationFrame(render);
    // }

    // render();
    renderer.setAnimationLoop( function () {
        ThreeMeshUI.update();
        teleportVR.update();
        renderer.render( scene, camera );
    } );
    
}

