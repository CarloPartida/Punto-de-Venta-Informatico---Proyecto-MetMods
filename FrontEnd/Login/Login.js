let passWord = document.getElementById("pass");
let botoNaso = document.getElementById("btn-mostrar");

botoNaso.onclick = function(e) {
    e.preventDefault();
    if (passWord.type === "password") {
        passWord.type = "text";
    } else {
        passWord.type = "password";
    }
};