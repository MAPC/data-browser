import Controller from '@ember/controller';
import config from '../config/environment';
import { service } from '@ember-decorators/service';
import { alias } from '@ember-decorators/object/computed';
import { computed, action } from '@ember-decorators/object';

export default class extends Controller {

  @service ajax

  constructor() {
    super(...arguments);

    this.queryParams = ['min', 'max'];
    this.years = [];

    this.min = 0;
    this.max = this.perPage = 50;
  }


  @computed('model.raw_data.rows.length')
  get pageCount() {
    return Math.ceil(this.get('model.raw_data.rows.length') / this.get('perPage'));
  }


  @computed('min', 'max')
  get page() {
    return Math.ceil(this.get('max') / this.get('perPage'));
  }


  @computed('model', 'model.years_available.@each.selected')
  get download_link() {
    let yearsSelected = this.get('model.years_available') || [];
    if (!yearsSelected.errors) {
      yearsSelected = yearsSelected.filterBy('selected', true);
    }

    let filterToken = '';
    if (this.get('model.dataset.hasYears') && yearsSelected[0]) {
      let str = yearsSelected.map((el) => { return el.year }).join("','");
      filterToken = ` WHERE ${this.get('model.dataset.yearcolumn')} IN ('${str}')`;
    }

    return `${config.dataBrowserEndpoint} select * from ${this.get('model.dataset.table_name')} ${filterToken}&format=csv&filename=${this.get('model.dataset.table_name')}`;
  }


  @computed('model')
  get download_link_metadata() {
    return this.metadata_query('csv');
  }


  @computed('model', 'model.years_available.@each.selected')
  get download_link_shapefile() {
    return this.spatial_query('shp');
  }


  @computed('model', 'model.years_available.@each.selected')
  get download_link_geojson() {
    return this.spatial_query('geojson')
  }


  @computed('model', 'model.years_available.@each.selected')
  get download_link_visualize() {
    let download_link_geojson = encodeURIComponent(this.get('download_link_geojson'));
    return `http://oneclick.cartodb.com/?file=${download_link_geojson}&provider=MAPC&logo=http://data.mapc.org/img/mapc-color.png`;
  }


  metadata_query(format = 'json') {
    return `${config.dataBrowserEndpoint} select * from meta_${this.get('model.dataset.table_name')}&format=${format}&filename=meta_${this.get('model.dataset.table_name')}`;
  }


  spatial_query(format) {
    let spatial_meta = this.get('model.raw_data.spatialMetaData');
    let tabular = this.get('model.dataset.table_name');
    let fields = Object.keys(this.get('model.raw_data.fields')).map((el) => { return `a.${el}` });
    let where = '';
    if (this.get('model.dataset.hasYears')) {
      let yearsSelected = this.get('model.years_available').filterBy('selected', true);
      let latest = yearsSelected[yearsSelected.length-1];
      where = ` WHERE a.${this.get('model.dataset.yearcolumn')} IN ('${latest.year}')`;
    }

    let select = `SELECT ${fields}, b.the_geom, b.the_geom_webmercator `;
    let from = `FROM ${tabular} a `;
    let inner_join = `INNER JOIN ${spatial_meta.table} b ON a.${spatial_meta.field} = b.${spatial_meta.field}`;
    let sql = encodeURIComponent(`${select} ${from} ${inner_join}${where}`);

    return `${config.dataBrowserEndpoint}${sql}&format=${format}&filename=${tabular}`;
  }


  @action
  toggle(year) {
    year.toggleProperty('selected');
  }


  @action
  next() {
    let { min, max, perPage, page, pageCount } = this.getProperties('min', 'max', 'perPage', 'page', 'pageCount');

    if (page !== pageCount) {
      this.set('min', min + perPage);
      this.set('max', max + perPage);
    }
  }


  @action
  previous() {
    let { min, max, perPage, page } = this.getProperties('min', 'max', 'perPage', 'page');

    console.log(page);

    if (page !== 1) {
      this.set('min', min - perPage);
      this.set('max', max - perPage);
    }
  }


  @action
  first() {
    this.set('min', 0);
    this.set('max', this.get('perPage'));
  }


  @action
  last() {
    const perPage = this.get('perPage');
    const { length } = this.get('model.raw_data.rows');

    this.set('min', length - (length % perPage));
    this.set('max', length);
  }

}
