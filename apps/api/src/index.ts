const serviceName = 'api';
const port = Number(process.env.PORT ?? 3000);

console.log(`[TECH-005] ${serviceName} hello world levantado en puerto ${port}`);

setInterval(() => {
  // proceso vivo para modo dev placeholder
}, 60_000);
