import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const Estudiante = sequelize.define('estudiante', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    
    validate: { notEmpty: { msg: 'name.required' }, min: 5, max: 60 },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,                               // constraint en la BD
    validate: { isEmail: { msg: 'email.invalid' } },
  },
  carrera: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'estudiantes',
});