import { Repository } from "../shared/repository.js";
import { Zona } from "./zona.entity.js";
import { pool } from "../shared/db/conn.mysql.js";
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';


// Interfaz para los resultados de la base de datos
interface ZonaDB extends RowDataPacket {
  id: string;
  nombre: string;
}

export class ZonaRepository implements Repository<Zona> {
  
  private mapDbToEntity(row: ZonaDB): Zona {
    return Zona.fromDbRow(row);
  }

  public async findAll(): Promise<Zona[]> {
    try {
      const [rows] = await pool.query<ZonaDB[]>('SELECT * FROM zonas');
      return rows.map(row => this.mapDbToEntity(row));

    } catch (error) {
      console.error('Error en findAll:', error);
      throw new Error('No se pudieron obtener las zonas');
    }
  }

  public async findOne(id: string): Promise<Zona> {
    try {
      const [rows] = await pool.query<ZonaDB[]>(
        'SELECT * FROM zonas WHERE id = ?', 
        [id]
      );
      
      if (!rows[0]) {
        throw new Error(`Zona con ID ${id} no encontrado`);
      }
      
      return this.mapDbToEntity(rows[0]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('no encontrado')) {
        console.log(error.message);
        throw error;
      }
      
      console.error(`Error al buscar zona con ID ${id}:`, error);
      throw new Error('Error al buscar la zona');
    }
  }

  public async add(zonaInput: Omit<Zona, 'id'>): Promise<Zona> {
    try {
        const id = uuidv4();  // Genero el UUID en Node.js
        console.log('zonaInput recibido en add:', zonaInput);
        await pool.query<ResultSetHeader>(
            `INSERT INTO zonas (id, nombre)
             VALUES (?, ?)`,
            [
                id,
                zonaInput.nombre,
            ]
        );

        const [rows] = await pool.query<ZonaDB[]>(
            'SELECT * FROM zonas WHERE id = ?',
            [id]
        );

        if (!rows[0]) {
            throw new Error('No se pudo recuperar la zona después de crearla');
        }

        return this.mapDbToEntity(rows[0]);
    } catch (error) {
        console.error('Error en add:', error);
        throw new Error('No se pudo agregar la zona');
    }
  }

  public async update(id: string, zonaData: Partial<Zona>): Promise<Zona> {
    try {
      const current = await this.findOne(id);
      
      const updated = {
        ...current,
        ...zonaData
      };

      await pool.query(
        `UPDATE zonas SET 
          nombre = ?, 
         WHERE id = ?`,
        [
          updated.nombre,
          id
        ]
      );

      const [rows] = await pool.query<ZonaDB[]>(
        'SELECT * FROM zonas WHERE id = ?', 
        [id]
      );

      if (!rows[0]) {
        throw new Error('No se pudo recuperar la zona después de actualizar');
      }

      return this.mapDbToEntity(rows[0]);
    } catch (error) {
      console.error(`Error al actualizar la zonba con ID ${id}:`, error);
      throw new Error('No se pudo actualizar la zona');
    }
  }

  public async delete(id: string): Promise<Zona> {
    try {
      const zona = await this.findOne(id);
      await pool.query('DELETE FROM zonas WHERE id = ?', [id]);
      return zona;
    } catch (error) {
      console.error(`Error al eliminar zona con ID ${id}:`, error);
      throw new Error('No se pudo eliminar la zona');
    }
  }
}