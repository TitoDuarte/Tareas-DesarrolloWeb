import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const Usuario = sequelize.define('usuario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { len: [3, 30] },
  },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'usuarios',
});
