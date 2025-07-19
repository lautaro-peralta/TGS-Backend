export class Zona {
  constructor(
    public id: string, //UUID
    public nombre: string,
  ){}

  
  public static fromDbRow(row: any): Zona {
    return new Zona(
      row.id, //UUID
      row.nombre,
    );
  }
}
  