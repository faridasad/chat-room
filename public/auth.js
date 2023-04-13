"use strict";
const usernameInput = document.querySelector("input[name='username']");
let passwordInput;
const grid = document.querySelector(".grid");
const form = document.querySelector("form");
const button = document.querySelector("button");

usernameInput.addEventListener("change", () => {
  if (
    usernameInput.value.length < 5 ||
    usernameInput.value.length > 13 ||
    !usernameInput.value.match(/^[a-zA-Z0-9]+$/)
  ){
    usernameInput.setAttribute("aria-invalid", true);
    button.disabled = true;
  }else{
    button.disabled = false;
    usernameInput.setAttribute("aria-invalid", false);
  }

  if (usernameInput.value === admin) {
    grid.innerHTML = `
          <input
            type="text"
            name="username"
            placeholder="Username"
            value="${usernameInput.value}"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            />
      `;
    passwordInput = document.querySelector("input[name='password']");
  }
});

passwordInput?.addEventListener("change", () => {
  if (passwordInput.value === pass)
    passwordInput.setAttribute("aria-invalid", false);
  else passwordInput.setAttribute("aria-invalid", true);
});

