import './App.css';

import React, { useState } from 'react';
import ReactDomServer from 'react-dom/server'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCloudRain, faCloudSunRain, faWind } from '@fortawesome/free-solid-svg-icons'

import { motion } from 'framer-motion';

import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';

import { Canvas } from '@react-three/fiber'
import { useThree } from '@react-three/fiber'

let lat = -3.0, long = -3.0, jsonData

let options = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 0
}

class WeatherView extends React.Component {
  response = ""
  constructor(props) {
    super(props)

    this.hours = new Date().getHours()
    this.state = {
      data: props.data,
      skyColor: props.skyColor
    }
  }


  render() {
    return <>
      <motion.div className='weatherView' >
        <div className='content'>
          <span className="temps">{Math.round(this.state.data.hourly.temperature_2m[new Date().getHours()])}<sup>{this.state.data.hourly_units.temperature_2m}</sup></span>
          <div className="feelTempParent"><span className="feelTempText">Feels Like</span><span className="feelTemp"> {Math.round(this.state.data.hourly.apparent_temperature[new Date().getHours()])}<sup>{this.state.data.hourly_units.apparent_temperature}</sup></span></div>
          <div className="precipitationHours">
            <div className="precipitationHourTitle">Hourly</div>
            <ul className="precipitationHourPercent">
              <li> <FontAwesomeIcon icon={faCloudRain} />  <span className="time">{(this.hours - 2 +24) % 24}:00</span>{this.state.data.hourly.precipitation[(this.hours - 2) % 24]}</li>
              <li> <FontAwesomeIcon icon={faCloudRain} />  <span className="time">{(this.hours - 1 + 24)%24}:00</span>{this.state.data.hourly.precipitation[(this.hours - 1) % 24]}</li>
              <li> <FontAwesomeIcon icon={faCloudRain} />  <span className="time">{this.hours}:00</span>{this.state.data.hourly.precipitation[this.hours % 24]}</li>
              <li> <FontAwesomeIcon icon={faCloudRain} />  <span className="time">{(this.hours + 1) % 24}:00</span>{this.state.data.hourly.precipitation[(this.hours + 1) % 24]}</li>
              <li> <FontAwesomeIcon icon={faCloudRain} />  <span className="time">{(this.hours + 2) % 24}:00</span>{this.state.data.hourly.precipitation[(this.hours + 2) % 24]}</li>
              <li> <FontAwesomeIcon icon={faCloudRain} />  <span className="time">{(this.hours + 3) % 24}:00</span>{this.state.data.hourly.precipitation[(this.hours + 3) % 24]}</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </>
  }
}
// location
async function location() {
  return new Promise((r, e) => {
    navigator.geolocation.getCurrentPosition(async function (pos) {
      lat = pos.coords.latitude
      long = pos.coords.longitude
      r([lat, long])
    }, (e) => console.log("ERR:" + e.message.toString()), options)
  })
}

await location()


function skySetup(elevation, night) {

  let sun = new THREE.Vector3(1000, 2, 1000)
  let azimuth = 70

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000)

  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg'),
  })


  sun.setFromSphericalCoords(100000, (90 - elevation) * Math.PI / 180, azimuth * Math.PI / 180)

  let sky = new Sky();
  scene.add(sky)
  sky.scale.setScalar(45000);

  const uniforms = sky.material.uniforms
  uniforms['sunPosition'] = { value: sun }
  uniforms['turbidity'] = { value: 6 }
  uniforms['exposure'] = { value: 0.1518 }
  uniforms['mieCoefficient'] = { value: 0.005 }
  uniforms['mieDirectionalG'] = { value: 0.779 }
  uniforms['up'] = { value: new THREE.Vector3(0, 1, 0) }

  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  if (!night) {
    console.log("not night")
    uniforms['rayleigh'] = { value: 3 }
    renderer.toneMappingExposure = 0.1400;
  } else {
    console.log("night")
    // set looks
    renderer.toneMappingExposure = 0.0091;
    uniforms['rayleigh'] = { value: 0 }

    // add stars
    for (let i = 0; i < 1000; i++) {
      const geometry = new THREE.SphereGeometry(0.025, 24, 24);
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const star = new THREE.Mesh(geometry, material);

      const [x, y, z] = Array(3)
        .fill()
        .map(() => THREE.MathUtils.randFloatSpread(100));

      star.position.set(x, y, z);
      scene.add(star);
    }
    //star lightinng
    const ambientLight = new THREE.AmbientLight(0xffffff, 1000)
    scene.add(ambientLight)
  }
  console.log(sky)

  let point = new THREE.PointLight(0xffffff, 1, 1000)
  point.position.set(sun.x, sun.y, sun.z)
  scene.add(point)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(sun.x, sun.y, sun.z)
  scene.add(directionalLight);


  const controls = new OrbitControls(camera, renderer.domElement);

  controls.target.copy(new THREE.Vector3(sun.x, sun.y, sun.z));
  controls.enabled = false;
  controls.update()

  renderer.render(scene, camera)


  function animate() {

    requestAnimationFrame(animate);

    // required if controls.enableDamping or controls.autoRotate are set to true
    controls.update();

    renderer.render(scene, camera);

  }
  animate()
}
const req = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${long}`

var getJSON = function (url, callback) {

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'json';

  xhr.onload = function () {

    var status = xhr.status;

    if (status == 200) {
      callback(null, xhr.response);
    } else {
      callback(status);
    }
  };

  xhr.send();
};

getJSON(req, function (err, e) {

  if (err != null) {
    console.error(err);
  } else {
    // skySetup(Math.abs(e.elevation), new Date().getHours() >= 20 || new Date().getHours() < 6)
    skySetup(Math.abs(e.elevation), new Date().getHours() >= 20 || new Date().getHours() < 6)
    console.log("eleveation", e)
  }
});


function App() {
  let sample = { "latitude": 10.75, "longitude": 78.75, "generationtime_ms": 1.0269880294799805, "utc_offset_seconds": 19800, "timezone": "Asia/Kolkata", "timezone_abbreviation": "IST", "elevation": 79.0, "hourly_units": { "time": "iso8601", "temperature_2m": "°C", "relativehumidity_2m": "%", "apparent_temperature": "°C", "precipitation_probability": "%", "precipitation": "mm", "rain": "mm", "showers": "mm", "snowfall": "cm", "snow_depth": "m", "cloudcover": "%", "visibility": "m" }, "hourly": { "time": ["2023-04-19T00:00", "2023-04-19T01:00", "2023-04-19T02:00", "2023-04-19T03:00", "2023-04-19T04:00", "2023-04-19T05:00", "2023-04-19T06:00", "2023-04-19T07:00", "2023-04-19T08:00", "2023-04-19T09:00", "2023-04-19T10:00", "2023-04-19T11:00", "2023-04-19T12:00", "2023-04-19T13:00", "2023-04-19T14:00", "2023-04-19T15:00", "2023-04-19T16:00", "2023-04-19T17:00", "2023-04-19T18:00", "2023-04-19T19:00", "2023-04-19T20:00", "2023-04-19T21:00", "2023-04-19T22:00", "2023-04-19T23:00", "2023-04-20T00:00", "2023-04-20T01:00", "2023-04-20T02:00", "2023-04-20T03:00", "2023-04-20T04:00", "2023-04-20T05:00", "2023-04-20T06:00", "2023-04-20T07:00", "2023-04-20T08:00", "2023-04-20T09:00", "2023-04-20T10:00", "2023-04-20T11:00", "2023-04-20T12:00", "2023-04-20T13:00", "2023-04-20T14:00", "2023-04-20T15:00", "2023-04-20T16:00", "2023-04-20T17:00", "2023-04-20T18:00", "2023-04-20T19:00", "2023-04-20T20:00", "2023-04-20T21:00", "2023-04-20T22:00", "2023-04-20T23:00", "2023-04-21T00:00", "2023-04-21T01:00", "2023-04-21T02:00", "2023-04-21T03:00", "2023-04-21T04:00", "2023-04-21T05:00", "2023-04-21T06:00", "2023-04-21T07:00", "2023-04-21T08:00", "2023-04-21T09:00", "2023-04-21T10:00", "2023-04-21T11:00", "2023-04-21T12:00", "2023-04-21T13:00", "2023-04-21T14:00", "2023-04-21T15:00", "2023-04-21T16:00", "2023-04-21T17:00", "2023-04-21T18:00", "2023-04-21T19:00", "2023-04-21T20:00", "2023-04-21T21:00", "2023-04-21T22:00", "2023-04-21T23:00", "2023-04-22T00:00", "2023-04-22T01:00", "2023-04-22T02:00", "2023-04-22T03:00", "2023-04-22T04:00", "2023-04-22T05:00", "2023-04-22T06:00", "2023-04-22T07:00", "2023-04-22T08:00", "2023-04-22T09:00", "2023-04-22T10:00", "2023-04-22T11:00", "2023-04-22T12:00", "2023-04-22T13:00", "2023-04-22T14:00", "2023-04-22T15:00", "2023-04-22T16:00", "2023-04-22T17:00", "2023-04-22T18:00", "2023-04-22T19:00", "2023-04-22T20:00", "2023-04-22T21:00", "2023-04-22T22:00", "2023-04-22T23:00", "2023-04-23T00:00", "2023-04-23T01:00", "2023-04-23T02:00", "2023-04-23T03:00", "2023-04-23T04:00", "2023-04-23T05:00", "2023-04-23T06:00", "2023-04-23T07:00", "2023-04-23T08:00", "2023-04-23T09:00", "2023-04-23T10:00", "2023-04-23T11:00", "2023-04-23T12:00", "2023-04-23T13:00", "2023-04-23T14:00", "2023-04-23T15:00", "2023-04-23T16:00", "2023-04-23T17:00", "2023-04-23T18:00", "2023-04-23T19:00", "2023-04-23T20:00", "2023-04-23T21:00", "2023-04-23T22:00", "2023-04-23T23:00", "2023-04-24T00:00", "2023-04-24T01:00", "2023-04-24T02:00", "2023-04-24T03:00", "2023-04-24T04:00", "2023-04-24T05:00", "2023-04-24T06:00", "2023-04-24T07:00", "2023-04-24T08:00", "2023-04-24T09:00", "2023-04-24T10:00", "2023-04-24T11:00", "2023-04-24T12:00", "2023-04-24T13:00", "2023-04-24T14:00", "2023-04-24T15:00", "2023-04-24T16:00", "2023-04-24T17:00", "2023-04-24T18:00", "2023-04-24T19:00", "2023-04-24T20:00", "2023-04-24T21:00", "2023-04-24T22:00", "2023-04-24T23:00", "2023-04-25T00:00", "2023-04-25T01:00", "2023-04-25T02:00", "2023-04-25T03:00", "2023-04-25T04:00", "2023-04-25T05:00", "2023-04-25T06:00", "2023-04-25T07:00", "2023-04-25T08:00", "2023-04-25T09:00", "2023-04-25T10:00", "2023-04-25T11:00", "2023-04-25T12:00", "2023-04-25T13:00", "2023-04-25T14:00", "2023-04-25T15:00", "2023-04-25T16:00", "2023-04-25T17:00", "2023-04-25T18:00", "2023-04-25T19:00", "2023-04-25T20:00", "2023-04-25T21:00", "2023-04-25T22:00", "2023-04-25T23:00"], "temperature_2m": [28.8, 28.1, 27.5, 27.0, 26.9, 26.9, 26.8, 28.4, 30.7, 39.8, 34.6, 36.7, 38.2, 39.3, 40.0, 40.1, 39.5, 38.8, 36.1, 33.5, 32.0, 30.7, 29.7, 29.0, 28.4, 27.7, 27.1, 26.7, 26.3, 26.1, 26.1, 27.7, 30.1, 32.2, 34.4, 36.2, 37.9, 39.2, 39.9, 40.1, 39.8, 39.1, 36.3, 33.5, 31.9, 30.7, 29.9, 29.2, 28.5, 27.9, 27.4, 27.1, 26.9, 26.8, 26.7, 28.4, 30.4, 32.4, 34.7, 36.8, 38.6, 39.8, 40.4, 40.5, 40.2, 39.4, 35.3, 33.3, 31.6, 30.4, 29.7, 29.2, 28.5, 28.0, 27.6, 27.3, 27.1, 26.9, 26.8, 28.4, 30.9, 33.2, 35.2, 37.1, 38.8, 39.8, 40.3, 40.3, 40.0, 39.3, 37.0, 33.8, 30.2, 28.9, 28.1, 27.5, 27.2, 27.1, 27.0, 26.8, 26.6, 26.7, 27.2, 28.0, 29.4, 30.6, 32.1, 34.0, 35.3, 36.6, 37.4, 36.6, 35.0, 33.0, 32.1, 31.3, 30.5, 29.9, 29.4, 28.8, 28.2, 27.7, 27.1, 26.7, 26.5, 26.6, 27.2, 28.1, 29.6, 31.2, 33.0, 34.8, 36.2, 37.0, 37.6, 37.7, 37.6, 36.8, 35.7, 34.2, 32.2, 31.0, 29.9, 28.7, 28.2, 28.0, 27.7, 27.4, 27.1, 27.0, 27.4, 28.0, 29.3, 30.8, 32.6, 34.7, 36.0, 37.1, 38.0, 38.2, 38.1, 37.2, 35.7, 33.7, 31.4, 30.4, 29.6, 28.8], "relativehumidity_2m": [79, 84, 89, 92, 93, 89, 88, 80, 67, 55, 47, 38, 31, 27, 24, 23, 24, 25, 39, 52, 58, 64, 70, 74, 76, 80, 83, 86, 89, 91, 92, 84, 72, 62, 53, 45, 37, 31, 26, 23, 22, 22, 36, 50, 59, 63, 68, 70, 74, 79, 83, 86, 87, 88, 89, 81, 68, 59, 49, 41, 33, 27, 24, 21, 21, 22, 45, 51, 58, 65, 68, 71, 76, 80, 83, 85, 87, 89, 90, 82, 66, 56, 50, 43, 36, 30, 26, 24, 24, 23, 34, 50, 68, 74, 77, 80, 82, 84, 86, 87, 88, 88, 85, 81, 75, 69, 63, 55, 49, 43, 39, 42, 48, 56, 61, 66, 71, 73, 74, 76, 80, 84, 89, 92, 94, 94, 91, 86, 78, 69, 59, 49, 42, 38, 35, 34, 33, 35, 39, 44, 53, 61, 70, 79, 83, 84, 86, 88, 89, 89, 87, 84, 77, 69, 59, 48, 42, 38, 34, 32, 31, 33, 40, 50, 62, 68, 72, 76], "apparent_temperature": [34.7, 34.4, 34.1, 33.6, 33.6, 33.0, 32.8, 34.3, 35.6, 37.5, 40.1, 42.5, 43.7, 44.0, 43.4, 41.8, 40.4, 39.8, 37.9, 36.6, 35.4, 34.6, 34.1, 33.8, 33.5, 33.1, 32.5, 32.0, 31.9, 31.8, 32.0, 33.6, 35.6, 37.8, 40.6, 42.6, 44.0, 44.7, 44.2, 42.5, 40.4, 39.6, 37.6, 36.2, 35.4, 34.4, 33.9, 33.5, 33.4, 33.2, 32.8, 32.7, 32.6, 32.6, 32.8, 34.3, 35.4, 37.5, 40.2, 42.7, 44.0, 44.4, 44.2, 42.4, 40.7, 39.4, 37.5, 36.0, 34.7, 34.1, 33.9, 33.9, 33.6, 33.2, 33.0, 33.0, 33.1, 33.1, 33.3, 34.7, 35.9, 37.9, 41.1, 43.7, 45.1, 45.1, 44.4, 42.7, 41.3, 39.9, 39.3, 37.7, 34.8, 33.5, 32.8, 32.5, 32.5, 32.8, 33.2, 33.0, 32.8, 32.8, 33.2, 33.8, 35.0, 36.1, 38.0, 40.2, 41.8, 42.9, 42.9, 41.2, 39.1, 37.2, 36.7, 36.6, 36.3, 35.9, 35.2, 34.4, 34.1, 33.7, 33.4, 33.2, 33.1, 33.3, 33.9, 34.7, 36.1, 37.6, 40.0, 41.8, 42.4, 42.6, 42.0, 41.0, 40.0, 39.2, 38.2, 36.7, 35.3, 34.9, 35.0, 34.8, 34.7, 34.6, 34.5, 34.1, 33.5, 33.3, 33.6, 34.2, 35.3, 36.5, 38.4, 41.0, 42.2, 42.8, 42.4, 41.1, 40.0, 39.0, 38.3, 37.1, 35.4, 34.9, 34.5, 34.1], "precipitation_probability": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 6, 9, 13, 16, 16, 16, 16, 13, 9, 6, 6, 6, 6, 4, 2, 0, 0, 0, 0, 0, 0, 0, 9, 17, 26, 29, 32, 35, 29, 22, 16, 13, 9, 6, 5, 4, 3, 3, 3, 3, 3, 3, 3, 5, 8, 10, 16, 23, 29, 30, 31, 32, 34, 37, 39, 30, 22, 13, 11, 8, 6, 4, 2, 0, 0, 0, 0, 1, 2, 3, 6, 10, 13, 15, 17, 19], "precipitation": [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.40, 0.40, 0.40, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.30, 0.30, 0.30, 0.20, 0.20, 0.20, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00], "rain": [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00], "showers": [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.70, 0.70, 0.70, 0.70, 0.70, 0.70, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.40, 0.40, 0.40, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.30, 0.30, 0.30, 0.20, 0.20, 0.20, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00], "snowfall": [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00], "snow_depth": [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00], "cloudcover": [0, 0, 25, 47, 61, 26, 0, 0, 10, 26, 24, 19, 9, 6, 11, 27, 19, 0, 20, 0, 3, 0, 2, 14, 34, 7, 0, 0, 4, 10, 4, 31, 40, 43, 35, 34, 17, 14, 11, 17, 25, 6, 0, 0, 0, 43, 0, 0, 29, 30, 36, 40, 57, 46, 6, 0, 43, 32, 0, 0, 0, 4, 7, 10, 13, 26, 15, 0, 0, 50, 100, 98, 64, 42, 36, 24, 14, 4, 29, 25, 52, 52, 13, 30, 32, 35, 40, 45, 65, 80, 87, 93, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 97, 94, 91, 94, 97, 100, 89, 77, 66, 76, 87, 97, 98, 99, 100, 100, 100, 100, 100, 100, 100, 84, 67, 51, 47, 43, 39, 39, 38, 38, 64, 72, 79, 86, 93, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 99, 99, 86, 73, 60, 65, 71, 76, 77, 78, 79, 77, 75, 73, 63, 52, 42, 61, 81, 100], "visibility": [24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 2800.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24120.00, 24120.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00, 24140.00] }, "daily_units": { "time": "iso8601", "temperature_2m_max": "°C", "temperature_2m_min": "°C", "apparent_temperature_max": "°C", "apparent_temperature_min": "°C", "sunrise": "iso8601", "sunset": "iso8601", "uv_index_max": "", "uv_index_clear_sky_max": "", "precipitation_hours": "h" }, "daily": { "time": ["2023-04-19", "2023-04-20", "2023-04-21", "2023-04-22", "2023-04-23", "2023-04-24", "2023-04-25"], "temperature_2m_max": [40.1, 40.1, 40.5, 40.3, 37.4, 37.7, 38.2], "temperature_2m_min": [26.8, 26.1, 26.7, 26.8, 26.6, 26.5, 27.0], "apparent_temperature_max": [44.0, 44.7, 44.4, 45.1, 42.9, 42.6, 42.8], "apparent_temperature_min": [32.8, 31.8, 32.6, 32.5, 32.5, 33.1, 33.3], "sunrise": ["2023-04-19T06:01", "2023-04-20T06:00", "2023-04-21T06:00", "2023-04-22T05:59", "2023-04-23T05:59", "2023-04-24T05:58", "2023-04-25T05:58"], "sunset": ["2023-04-19T18:27", "2023-04-20T18:27", "2023-04-21T18:27", "2023-04-22T18:27", "2023-04-23T18:27", "2023-04-24T18:27", "2023-04-25T18:28"], "uv_index_max": [9.30, 9.30, 9.30, 9.35, 8.00, 9.35, 8.95], "uv_index_clear_sky_max": [9.30, 9.30, 9.30, 9.35, 9.35, 9.40, 9.05], "precipitation_hours": [0.0, 0.0, 0.0, 6.0, 3.0, 3.0, 3.0] } }
  // setTimeout(() => {
  //   const req = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${long}`
  //   fetch(req)
  //     .then((e) => e.json())
  //     .then(
  //       (e) => {
  //         skySetup(Math.abs(e.elevation), new Date().getHours() - 12 > 10 || new Date().getHours() < 6)
  //         console.log("eleveation", Math.abs(e.elevation))
  //       }
  //     )
  // }, 10);
  let [elements, setElements] = useState(<motion.div className="parent">
    <WeatherView lat={lat} long={long} data={sample} />
  </motion.div>)
  setTimeout(() => {
    let request = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&hourly=temperature_2m,relativehumidity_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,snowfall,snow_depth,cloudcover,visibility&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,uv_index_clear_sky_max,precipitation_hours&timezone=auto`
    // console.log(request)

    fetch(request)
      .then((res) => res.json())
      .then((data) => {
        console.log(request)
        jsonData = data
        // skyColor(lat, long)
        // setThree(2, 180)
        setElements(<>
          <motion.div className="parent">
            <WeatherView lat={lat} long={long} data={jsonData} />
          </motion.div>
        </>)
      })

      .catch((err) => {
        console.log(err.message);
      })
    // console.log(jsonData)

    console.log(lat, long)

  }, 100)

  return elements
}

export default App;
