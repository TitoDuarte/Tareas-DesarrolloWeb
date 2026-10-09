import {Sequelize} from 'sequelize';
import { config } from './config.mjs';

export const sequelize = new Sequelize(config.db, {
    logging: true,
    define: {underscored: true, timestamps: true },
})

export async function conectar(){
    await sequelize.authenticate();
    console.log("Sequelize conectado");
    await sequelize.sync({ alter: true });
}

