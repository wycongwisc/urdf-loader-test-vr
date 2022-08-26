# Studio

An web-based application for running robot experiments in VR. The application is hosted [here](https://wycongwisc.github.io/urdf-loader-test-vr/).

## Design

## Debugging VR

*NOTE: This assumes developer mode is enabled in the Quest and `adb` is installed.*

1. Plug the Quest into the computer.
2. Start the application on a live server with VSCode. 
3. Open the terminal and type the command `adb reverse tcp:<port> tcp:<port>` where `<port>` corresponds to the port the live server is running on.
4. With the live server running, go to `http://localhost:<port>` in the Quest browser. The application should appear.
5. To use the chrome debugger, go to `chrome://inspect/#devices` in Google Chrome and click `inspect`.
