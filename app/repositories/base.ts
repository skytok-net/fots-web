
import { pglite } from '~/lib/pglite';

export interface BaseRepositoryInterface {

}

export class BaseRepository implements BaseRepositoryInterface {
    protected db = pglite.db;

    constructor() {
        this.db = pglite.db;
    }
}