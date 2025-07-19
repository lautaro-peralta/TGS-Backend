import { Request, Response, NextFunction } from "express"
import { ZonaRepository } from "./zona.repository.js"
import { Zona } from "./zona.entity"


const repository = new ZonaRepository()

function sanitizarInputZona(req:Request, res:Response,next:NextFunction){
  const body = req.body;

  const zonaSanitizada = {
    nombre: typeof body.nombre === "string" ? body.nombre.trim() : undefined,
  };

  req.body.zonaSanitizada = zonaSanitizada;

  next()
  
}

async function findAll(req: Request, res: Response) {
  try {
    const zonas = await repository.findAll();
    res.status(200).json({ data: zonas });
  } catch (err) {
    res.status(500).json({ message: "Error al obtener zonas" });
  }
}


async function findOne(req: Request, res: Response) {
  try {
    const id = req.params.id.trim(); // se toma el id de la URL
    const zona = await repository.findOne(id); // busca la zona
    if (!zona) {
      return res.status(404).send({ message: "Zona no encontrada" });
    }
    res.json({ data: zona }); // responde con la zona encontrada
  } catch (err) {
    return res.status(400).send({ message: "Error al buscar zona" });
  }
}


async function add(req: Request, res: Response) {
  const input = req.body.zonaSanitizada;

  const inputZona = new Zona(
    '',             // ID vacío, se genera en el repo o DB
    input.nombre
  );

  try {
    const zona = await repository.add(inputZona);
    return res.status(201).send({ message: "Zona creada", data: zona });
  } catch (err: any) {
    return res.status(400).send({ message: err.message || "Error al crear zona" });
  }
}


async function update(req: Request, res: Response) {
  try {
    const id = req.params.id.trim();
    const input = req.body.zonaSanitizada;

    const zona = await repository.update(id, input);

    if (!zona) {
      return res.status(404).send({ message: "Zona no encontrada" });
    }

    return res.status(200).send({ message: "Zona actualizada correctamente", data: zona });
  } catch (err) {
    return res.status(400).send({ message: "Error al actualizar zona" });
  }
}


async function remove(req: Request, res: Response) {
  try {
    const id = req.params.id.trim();
    const zona = await repository.delete(id);
    if (!zona) {
      return res.status(404).send({ message: "Zona no encontrada" });
    }
    res.status(200).send({ message: "Zona eliminada exitosamente" });
  } catch (err) {
    return res.status(400).send({ message: "Error al eliminar zona" });
  }
}


export {
  sanitizarInputZona,
  findAll,
  findOne,
  add,
  update,
  remove,
};
