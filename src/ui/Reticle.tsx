/** Dotted corner brackets + center crosshair framing the map viewport. */
export default function Reticle() {
  return (
    <div className="reticle" aria-hidden>
      <div className="reticle__corner reticle__corner--tl" />
      <div className="reticle__corner reticle__corner--tr" />
      <div className="reticle__corner reticle__corner--bl" />
      <div className="reticle__corner reticle__corner--br" />
      <div className="reticle__cross" />
    </div>
  );
}
