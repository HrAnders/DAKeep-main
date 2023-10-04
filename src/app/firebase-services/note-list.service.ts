import { Injectable, inject } from '@angular/core';
import { Note } from '../interfaces/note.interface';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NoteListService {
  trashNotes: Note[] = [];
  normalNotes: Note[] = [];
  normalMarkedNotes: Note[] = [];

  //items$;
  //items;
  unsubNotes;
  unsubTrash;
  unsubMarkedNotes;

  firestore: Firestore = inject(Firestore);

  constructor() {
    //onSnapshot funktioniert ähnlich wie collectiondata, lässt sich aber schneller einfügen und ermöglicht
    //detailliertere Datenreturns, z.B. Ids
    this.unsubNotes = this.subNotesList();
    this.unsubMarkedNotes = this.subMarkedNotesList();
    this.unsubTrash = this.subTrashList();

    //items$ ist ein observable: es reagiert auf veränderte Daten in der Datenbank
    //this.items$ = collectionData(this.getNoteRef());
    //this.items = this.items$.subscribe((list)=>{
    //  list.forEach(element => {
    //    console.log(element);
    //  });
    //});
  }

  async deleteNote(colId: "notes" | "trash", docId: string){
    await deleteDoc(this.getSingleRef(colId, docId)).catch(
      (err) => {
        console.log(err)
      }
    );
  }

  async updateNote(note: Note) {
    if (note.id) {
      let docRef = this.getSingleRef(this.getColIdFromNote(note), note.id);
      await updateDoc(docRef, this.getCleanJson(note)).catch((err) => {
        console.log(err);
      });
    }
  }

  getCleanJson(note: Note){
    return {
      type: note.type,
      title: note.title,
      content: note.content,
      marked: note.marked
    }
  }

  getColIdFromNote(note: Note) {
    if (note.type == 'note') {
      return 'notes';
    } else {
      return 'trash';
    }
  }

  //Funktion erhält hinzuzufügendes item --> addDoc fügt es durch collectionReference hinzu
  async pushNote(item: Note, colId: "notes" | "trash"){
    await addDoc((colId=="notes"?this.getNoteRef() : this.getTrashRef()), item)
      .catch((err) => {
        console.log("Error:" + err);
        console.error(err);
      })
      .then((docRef) => {
        console.log('Document written with ID: ', docRef?.id);
      });
  }

  subNotesList() {
    const q = query(this.getNoteRef(),limit(100));
    return onSnapshot(q, (list) => {
      this.normalNotes = [];
      list.forEach((element) => {
        this.normalNotes.push(this.setNoteObject(element.data(), element.id));
      });
    });
  }

  subMarkedNotesList() {
    const q = query(this.getNoteRef(), where("marked","==",true),limit(100));
    return onSnapshot(q, (list) => {
      this.normalMarkedNotes = [];
      list.forEach((element) => {
        this.normalMarkedNotes.push(this.setNoteObject(element.data(), element.id));
      });
    });
  }

  subTrashList() {
    return onSnapshot(this.getTrashRef(), (list) => {
      this.trashNotes = [];
      list.forEach((element) => {
        this.trashNotes.push(this.setNoteObject(element.data(), element.id));
      });
    });
  }

  setNoteObject(obj: any, id: string): Note {
    return {
      id: id || '',
      type: obj.type || 'note',
      title: obj.title || '',
      content: obj.content || '',
      marked: obj.marked || false,
    };
  }

  ngonDestroy() {
    //this.items.unsubscribe();
    this.unsubNotes();
    this.unsubTrash();
    this.unsubMarkedNotes();
  }

  //const itemCollection = collection(this.firestore, 'items');

  //collection-Referenz zu "notes"
  getNoteRef() {
    return collection(this.firestore, 'notes');
  }

  //collection-Referenz zu "trash"
  getTrashRef() {
    return collection(this.firestore, 'trash');
  }

  //Übergabe der CollectionData-Id an die Funktion, um daraus einzelne Doc-Data zu lesen
  //doc-data ist in der collectionData gespeichert --> agiert wie Container
  getSingleRef(colId: string, docId: string) {
    return doc(collection(this.firestore, colId), docId);
  }
}
