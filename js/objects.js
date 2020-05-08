var objects_obj = Array("drone-1-obj", "drone-2-obj");

var item_obj, item_mtl;
function generate_object() {
  item_obj = objects_obj[Math.floor(Math.random() * objects_obj.length)];
  if (item_obj == "drone-1-obj") {
    item_mtl = "drone-1-mtl";
  }
  if (item_obj == "drone-2-obj") {
    item_mtl = "drone-2-mtl";
  }
}
