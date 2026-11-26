// Elementos del formulario y botón de contraseña
let passWord = document.getElementById("pass");
let botoNaso = document.getElementById("btn-mostrar");
const formLogin = document.getElementById("loginForm");
const inputUsuario = document.getElementById("user");
const mensaje = document.getElementById("mensaje");

// Función para mostrar u ocultar la contraseña
if (botoNaso && passWord) 
{
    botoNaso.onclick = function(e) 
    {
        e.preventDefault();
        if (passWord.type === "password") 
        {
            passWord.type = "text";
        } 
        else 
        {
            passWord.type = "password";
        }
    };
}

// Función para iniciar sesión mediante fetch (JSON)
if (formLogin) 
{
    formLogin.addEventListener("submit", async (e) => 
    {
        e.preventDefault(); // Evita que la página se recargue de forma tradicional

        const nombre = inputUsuario.value;
        const password = passWord.value;

        try 
        {
            const res = await fetch("/login", 
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, password })
            });

            const data = await res.json();

            if (res.ok) 
            {
                mensaje.textContent = data.mensaje;
                mensaje.style.color = "#2fb344"; // Verde Tabler
                // Redirige a la página principal al iniciar sesión correctamente
                window.location.href = data.redirect || "/Pag Principal/PagP.html";
            } 
            else 
            {
                // Muestra errores de credenciales, intentos restantes o tiempo de bloqueo
                mensaje.textContent = data.mensaje;
                mensaje.style.color = "#d63939"; // Rojo Tabler
            }
        } 
        catch (error) 
        {
            console.error("Error al iniciar sesión:", error);
            mensaje.textContent = "Error de conexión con el servidor";
            mensaje.style.color = "#d63939";
        }
    });
}