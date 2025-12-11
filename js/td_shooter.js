// js/td_shooter.js
(function () {
  /**
   * td-hitscan-shooter
   *
   * Attached to an entity that has a raycaster component (here: the <a-cursor>).
   * On mouse click, it:
   *   - Forces the raycaster to check intersections
   *   - Picks the closest intersected entity
   *   - Emits "td-hit" on the first entity up the chain that has a hit-handler
   */
  AFRAME.registerComponent("td-hitscan-shooter", {
    schema: {
      enabled: { type: "boolean", default: true }
    },

    init() {
      this.onShoot = this.onShoot.bind(this);
      // Use global mousedown to be consistent with pointer lock
      window.addEventListener("mousedown", this.onShoot);
    },

    remove() {
      window.removeEventListener("mousedown", this.onShoot);
    },

    /**
     * Find nearest intersected entity (with a hit-handler in its ancestry)
     * and emit "td-hit" on that entity.
     */
    onShoot() {
      if (!this.data.enabled) {
        return;
      }

      const raycasterComp = this.el.components.raycaster;
      if (!raycasterComp) {
        console.warn("[td-hitscan-shooter] No raycaster component found on", this.el);
        return;
      }

      // Ensure the raycaster has the latest object list and intersections
      raycasterComp.refreshObjects();
      raycasterComp.checkIntersections();

      const intersections = raycasterComp.intersections || [];
      if (!intersections.length) {
        return; // No hit
      }

      // Take closest intersection
      let hitEl = intersections[0].object && intersections[0].object.el;
      if (!hitEl) {
        return;
      }

      // Walk up the hierarchy to find an entity that has a hit-handler
      let targetEl = hitEl;
      while (targetEl && !targetEl.components["hit-handler"] && targetEl.parentEl) {
        targetEl = targetEl.parentEl;
      }

      if (!targetEl || !targetEl.components["hit-handler"]) {
        // No hit-handler in chain; do nothing
        return;
      }

      // Trigger logical hit
      targetEl.emit("td-hit");
    }
  });
})();
