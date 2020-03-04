let level,username;
function toGame() {
    let username = document.getElementById("username").value;
    let level = document.getElementById("select_level").value;
    localStorage.setItem("username", username);
    localStorage.setItem("level", level);
    console.log(level);
    window.open('tower_defense.html');
}