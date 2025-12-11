// js/shoot.js
(function () {
  /**
   * Component that triggers a "shoot" event on mousedown.
   */
  AFRAME.registerComponent("click-to-shoot", {
    init() {
      this.onMouseDown = this.onMouseDown.bind(this);
      document.body.addEventListener("mousedown", this.onMouseDown);
    },

    remove() {
      document.body.removeEventListener("mousedown", this.onMouseDown);
    },

    onMouseDown() {
      this.el.emit("shoot");
    }
  });

  /**
   * Handles hit / die events from aframe-super-shooter-kit target entities.
   *
   * Can be attached to:
   *   - the drone itself (target-red / target-green)
   *   - its marker ring
   *
   * schema.id:
   *   - if set: id of the TARGET DRONE entity to destroy
   *   - if not set: we treat the current element as the target
   *
   * Global counters:
   *   - window.score_episode_red
   *   - window.score_episode_green
   */
  AFRAME.registerComponent("hit-handler", {
    schema: {
      id: { type: "string", default: "" } // linked target ID
    },

    init() {
      this.onDie = this.onDie.bind(this);
      this.el.addEventListener("die", this.onDie);
    },

    remove() {
      this.el.removeEventListener("die", this.onDie);
    },

    onDie() {
      // 1) Resolve which entity is the actual "target" (drone)
      let targetEl = null;

      if (this.data.id) {
        // Schema id points to the drone
        targetEl = document.getElementById(this.data.id);
      }

      if (!targetEl) {
        // Fallback: use the element itself as target
        targetEl = this.el;
      }

      // 2) Decide scoring based on the DRONE class, not the marker
      const classList = targetEl.classList || this.el.classList;

      if (
        classList &&
        classList.contains("target-red") &&
        typeof window.score_episode_red === "number"
      ) {
        window.score_episode_red += 1;
      }

      if (
        classList &&
        classList.contains("target-green") &&
        typeof window.score_episode_green === "number"
      ) {
        window.score_episode_green += 1;
      }

      // 3) Remove the drone from the scene
      if (targetEl.parentNode) {
        targetEl.parentNode.removeChild(targetEl);
      }

      // 4) Remove the ring/marker if this.el is different from the target
      if (this.el !== targetEl && this.el.parentNode) {
        this.el.parentNode.removeChild(this.el);
      }
    }
  });
})();
