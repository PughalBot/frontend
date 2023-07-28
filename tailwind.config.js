/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage:{
        'doodle': 'url(https://cdn.discordapp.com/attachments/981618787491127306/1134464332097396766/wp9524500.png)'
      },
      fontFamily: {
        'lbb': ['Bungee Spice', 'cursive'],
        'pp': ['Rampart One', 'cursive'],
      },
    },
  },
  plugins: [],
}