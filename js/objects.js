// js/objects.js
(function () {
  const OBJECT_IDS = Object.freeze(["drone-1-obj", "drone-2-obj", "drone-3-obj", "drone-4-obj"]);

  const MATERIAL_BY_OBJECT = Object.freeze({
    "drone-1-obj": "drone-1-mtl",
    "drone-2-obj": "drone-2-mtl",
    "drone-3-obj": "drone-3-mtl",
    "drone-4-obj": "drone-4-mtl"
  });

  /**
   * Picks a random object + matching material and exposes them on window:
   *   window.item_obj
   *   window.item_mtl
   */
  function generateObject() {
    if (!OBJECT_IDS.length) {
      console.warn("No object IDs configured for generateObject().");
      return;
    }

    const randomIndex = Math.floor(Math.random() * OBJECT_IDS.length);
    const objId = OBJECT_IDS[randomIndex];

    window.item_obj = objId;
    window.item_mtl = MATERIAL_BY_OBJECT[objId] || null;
  }

  // Expose for scene_build.js
  window.generate_object = generateObject;
})();
