import * as T from 'three';

export const TABLE_HEIGHT = 0.88;

export const SCENE_OFFSET = [1, 0, 0];

export const EE_TO_GRIPPER_OFFSET = 0.13;

export const EE_TO_THREE_ROT_OFFSET = new T.Quaternion().setFromEuler(new T.Euler(0, -Math.PI/2, -Math.PI/2, 'ZYX'));

export const T_ROS_to_THREE = new T.Matrix4().makeRotationFromEuler(new T.Euler(1.57079632679, 0., 0.));

export const T_THREE_to_ROS = T_ROS_to_THREE.clone().invert();

export const FONT_FAMILY = (location.hostname === 'localhost') ? './assets/Roboto-msdf.json' : '/urdf-loader-test-vr/assets/Roboto-msdf.json'

export const FONT_TEXTURE = (location.hostname === 'localhost') ? './assets/Roboto-msdf.png' : '/urdf-loader-test-vr/assets/Roboto-msdf.png'
