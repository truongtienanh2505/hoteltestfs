let message = null;
let notification = null;
let modal = null;

export const setAntdStatic = (m, n, mo) => {
  message = m;
  notification = n;
  modal = mo;
};

export { message, notification, modal };
