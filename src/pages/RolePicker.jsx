import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Stage } from '../components/Shell'
import { img } from '../data/assets'

export default function RolePicker() {
  const nav = useNavigate()
  const Card = ({ role, title, who, photo, delay, desc }) => (
    <button className="glass card-link rise" onClick={() => nav(`/${role}`)}
      style={{ width: 360, height: 440, padding: 26, textAlign: 'left', display: 'flex', flexDirection: 'column', animationDelay: delay }}>
      <img src={photo} alt="" style={{ width: 120, height: 120, borderRadius: role === 'manager' ? '50%' : 28, objectFit: 'cover', marginBottom: 'auto' }} />
      <div className="label" style={{ textTransform: 'uppercase', letterSpacing: '.12em' }}>{who}</div>
      <div style={{ fontSize: 34, fontWeight: 300, margin: '6px 0 10px' }}>{title}</div>
      <div style={{ fontSize: 13, opacity: .7, lineHeight: 1.5, marginBottom: 20 }}>{desc}</div>
      <span className="pill-btn white" style={{ alignSelf: 'flex-start' }}>Enter <ArrowRight size={15} /></span>
    </button>
  )
  return (
    <>
      <div className="bg"><div className="silk" /><div className="vignette" /></div>
      <Stage>
        <div className="abs rise" style={{ left: 0, right: 0, top: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 13, letterSpacing: '.3em', opacity: .7 }}>SPAX</div>
          <div style={{ fontSize: 40, fontWeight: 300, marginTop: 10 }}>Calm, coordinated spa operations</div>
          <div style={{ fontSize: 14, opacity: .65, marginTop: 10 }}>Radisson blu Glasgow · choose a workspace</div>
        </div>
        <div className="abs" style={{ left: 0, right: 0, top: 290, display: 'flex', justifyContent: 'center', gap: 32 }}>
          <Card role="manager" title="Manager" who="Hannah Reid · Spa Manager" photo={img.portraitManager} delay="80ms"
            desc="Bookings, staff insights, AI assignment, the live floor map and the room schedule at a glance." />
          <Card role="staff" title="Staff" who="Amy Morgan · Therapist" photo={img.portraitStaff} delay="160ms"
            desc="Your next task, shift tracker, step-by-step SOPs with AI help, and training at the point of need." />
        </div>
      </Stage>
    </>
  )
}
