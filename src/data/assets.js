// All imagery used by the dashboard. Swap any of these files in src/assets/
// for the original high-resolution exports from Figma.
import elena from '../assets/staff-elena.jpg'
import lisa from '../assets/staff-lisa.jpg'
import marcus from '../assets/staff-marcus.jpg'
import sofia from '../assets/staff-sofia.jpg'
import daniel from '../assets/staff-daniel.jpg'
import maya from '../assets/staff-maya.jpg'
import amara from '../assets/staff-amara.jpg'
import lucas from '../assets/staff-lucas.jpg'
import chloe from '../assets/staff-chloe.jpg'
import meManager from '../assets/me-manager.jpg'
import meStaff from '../assets/me-staff.jpg'
import leader from '../assets/leader-elena.jpg'
import portraitManager from '../assets/portrait-manager.jpg'
import portraitStaff from '../assets/portrait-staff.jpg'
import floorplan from '../assets/floorplan.webp'
import plantRoom from '../assets/plant-room.jpg'
import productCleanser from '../assets/product-cleanser.png'
import productCream from '../assets/product-marine-cream.png'
import productPads from '../assets/product-facial-pads.png'
import productEyeSerum from '../assets/product-eye-serum.png'
import trDeep from '../assets/train-deep-tissue.jpg'
import trScent from '../assets/train-signature-scent.jpg'
import trSetup from '../assets/train-room-setup.jpg'
import trStone from '../assets/train-hot-stone.jpg'
import trArrival from '../assets/train-arrival-ritual.jpg'
import trSound from '../assets/train-sound-bath.jpg'

export const img = {
  staff: { elena, lisa, marcus, sofia, daniel, maya, amara, lucas, chloe },
  meManager, meStaff, leader, portraitManager, portraitStaff,
  floorplan, plantRoom,
  products: { cleanser: productCleanser, cream: productCream, pads: productPads, eyeSerum: productEyeSerum },
  training: {
    deep: trDeep, scent: trScent, setup: trSetup, stone: trStone, arrival: trArrival, sound: trSound,
  },
}
