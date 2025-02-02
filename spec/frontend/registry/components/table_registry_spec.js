import Vue from 'vue';
import Vuex from 'vuex';
import { mount, createLocalVue } from '@vue/test-utils';
import createFlash from '~/flash';
import Tracking from '~/tracking';
import tableRegistry from '~/registry/components/table_registry.vue';
import { repoPropsData } from '../mock_data';
import * as getters from '~/registry/stores/getters';

jest.mock('~/flash');

const [firstImage, secondImage] = repoPropsData.list;

const localVue = createLocalVue();

localVue.use(Vuex);

describe('table registry', () => {
  let wrapper;
  let store;

  const findSelectAllCheckbox = (w = wrapper) => w.find('.js-select-all-checkbox > input');
  const findSelectCheckboxes = (w = wrapper) => w.findAll('.js-select-checkbox > input');
  const findDeleteButton = (w = wrapper) => w.find({ ref: 'bulkDeleteButton' });
  const findDeleteButtonsRow = (w = wrapper) => w.findAll('.js-delete-registry-row');
  const findPagination = (w = wrapper) => w.find('.js-registry-pagination');
  const findDeleteModal = (w = wrapper) => w.find({ ref: 'deleteModal' });
  const bulkDeletePath = 'path';

  const mountWithStore = config => mount(tableRegistry, { ...config, store, localVue });

  beforeEach(() => {
    // This is needed due to  console.error called by vue to emit a warning that stop the tests
    // see  https://github.com/vuejs/vue-test-utils/issues/532
    Vue.config.silent = true;

    store = new Vuex.Store({
      state: {
        isDeleteDisabled: false,
      },
      getters,
    });

    wrapper = mountWithStore({
      propsData: {
        repo: repoPropsData,
        canDeleteRepo: true,
      },
    });
  });

  afterEach(() => {
    Vue.config.silent = false;
    wrapper.destroy();
  });

  describe('rendering', () => {
    it('should render a table with the registry list', () => {
      expect(wrapper.findAll('.registry-image-row').length).toEqual(repoPropsData.list.length);
    });

    it('should render registry tag', () => {
      const tds = wrapper.findAll('.registry-image-row td');
      expect(tds.at(0).classes()).toContain('check');
      expect(tds.at(1).html()).toContain(repoPropsData.list[0].tag);
      expect(tds.at(2).html()).toContain(repoPropsData.list[0].shortRevision);
      expect(tds.at(3).html()).toContain(repoPropsData.list[0].layers);
      expect(tds.at(3).html()).toContain(repoPropsData.list[0].size);
      expect(tds.at(4).html()).toContain(wrapper.vm.timeFormated(repoPropsData.list[0].createdAt));
    });
  });

  describe('multi select', () => {
    it('selecting a row should enable delete button', done => {
      const deleteBtn = findDeleteButton(wrapper);
      const checkboxes = findSelectCheckboxes(wrapper);

      expect(deleteBtn.attributes('disabled')).toBe('disabled');

      checkboxes.at(0).trigger('click');
      Vue.nextTick(() => {
        expect(deleteBtn.attributes('disabled')).toEqual(undefined);
        done();
      });
    });

    it('selecting all checkbox should select all rows and enable delete button', done => {
      const selectAll = findSelectAllCheckbox(wrapper);
      const checkboxes = findSelectCheckboxes(wrapper);
      selectAll.trigger('click');

      Vue.nextTick(() => {
        const checked = checkboxes.filter(w => w.element.checked);
        expect(checked.length).toBe(checkboxes.length);
        done();
      });
    });

    it('deselecting select all checkbox should deselect all rows and disable delete button', done => {
      const checkboxes = findSelectCheckboxes(wrapper);
      const selectAll = findSelectAllCheckbox(wrapper);
      selectAll.trigger('click');
      selectAll.trigger('click');

      Vue.nextTick(() => {
        const checked = checkboxes.filter(w => !w.element.checked);
        expect(checked.length).toBe(checkboxes.length);
        done();
      });
    });

    it('should delete multiple items when multiple items are selected', done => {
      const multiDeleteItems = jest.fn().mockResolvedValue();
      wrapper.setMethods({ multiDeleteItems });
      const selectAll = findSelectAllCheckbox(wrapper);
      selectAll.trigger('click');

      Vue.nextTick(() => {
        const deleteBtn = findDeleteButton(wrapper);
        expect(wrapper.vm.selectedItems).toEqual([0, 1]);
        expect(deleteBtn.attributes('disabled')).toEqual(undefined);
        wrapper.setData({ itemsToBeDeleted: [...wrapper.vm.selectedItems] });
        wrapper.vm.handleMultipleDelete();

        Vue.nextTick(() => {
          expect(wrapper.vm.selectedItems).toEqual([]);
          expect(wrapper.vm.itemsToBeDeleted).toEqual([]);
          expect(wrapper.vm.multiDeleteItems).toHaveBeenCalledWith({
            path: bulkDeletePath,
            items: [firstImage.tag, secondImage.tag],
          });
          done();
        });
      });
    });

    it('should show an error message if bulkDeletePath is not set', () => {
      const showError = jest.fn();
      wrapper.setMethods({ showError });
      wrapper.setProps({
        repo: {
          ...repoPropsData,
          tagsPath: null,
        },
      });
      wrapper.vm.handleMultipleDelete();
      expect(createFlash).toHaveBeenCalled();
    });
  });

  describe('delete registry', () => {
    beforeEach(() => {
      wrapper.setData({ selectedItems: [0] });
    });

    it('should be possible to delete a registry', () => {
      const deleteBtn = findDeleteButton(wrapper);
      const deleteBtns = findDeleteButtonsRow(wrapper);
      expect(wrapper.vm.selectedItems).toEqual([0]);
      expect(deleteBtn).toBeDefined();
      expect(deleteBtn.attributes('disable')).toBe(undefined);
      expect(deleteBtns.is('button')).toBe(true);
    });

    it('should allow deletion row by row', () => {
      const deleteBtns = findDeleteButtonsRow(wrapper);
      const deleteSingleItem = jest.fn();
      const deleteItem = jest.fn().mockResolvedValue();
      wrapper.setMethods({ deleteSingleItem, deleteItem });
      deleteBtns.at(0).trigger('click');
      expect(wrapper.vm.deleteSingleItem).toHaveBeenCalledWith(0);
      wrapper.vm.handleSingleDelete(1);
      expect(wrapper.vm.deleteItem).toHaveBeenCalledWith(1);
    });
  });

  describe('modal event handlers', () => {
    beforeEach(() => {
      wrapper.vm.handleSingleDelete = jest.fn();
      wrapper.vm.handleMultipleDelete = jest.fn();
    });
    it('on ok when one item is selected should call singleDelete', () => {
      wrapper.setData({ itemsToBeDeleted: [0] });
      wrapper.vm.onDeletionConfirmed();

      expect(wrapper.vm.handleSingleDelete).toHaveBeenCalledWith(repoPropsData.list[0]);
      expect(wrapper.vm.handleMultipleDelete).not.toHaveBeenCalled();
    });
    it('on ok when multiple items are selected should call muultiDelete', () => {
      wrapper.setData({ itemsToBeDeleted: [0, 1, 2] });
      wrapper.vm.onDeletionConfirmed();

      expect(wrapper.vm.handleMultipleDelete).toHaveBeenCalled();
      expect(wrapper.vm.handleSingleDelete).not.toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    const repo = {
      repoPropsData,
      pagination: {
        total: 20,
        perPage: 2,
        nextPage: 2,
      },
    };

    beforeEach(() => {
      wrapper = mount(tableRegistry, {
        propsData: {
          repo,
        },
      });
    });

    it('should exist', () => {
      const pagination = findPagination(wrapper);
      expect(pagination.exists()).toBe(true);
    });
    it('should be visible when pagination is needed', () => {
      const pagination = findPagination(wrapper);
      expect(pagination.isVisible()).toBe(true);
      wrapper.setProps({
        repo: {
          pagination: {
            total: 0,
            perPage: 10,
          },
        },
      });
      expect(wrapper.vm.shouldRenderPagination).toBe(false);
    });
    it('should have a change function that update the list when run', () => {
      const fetchList = jest.fn().mockResolvedValue();
      wrapper.setMethods({ fetchList });
      wrapper.vm.onPageChange(1);
      expect(wrapper.vm.fetchList).toHaveBeenCalledWith({ repo, page: 1 });
    });
  });

  describe('modal content', () => {
    it('should show the singular title and image name when deleting a single image', () => {
      wrapper.setData({ selectedItems: [1, 2, 3] });
      wrapper.vm.deleteSingleItem(0);
      expect(wrapper.vm.modalAction).toBe('Remove tag');
      expect(wrapper.vm.modalDescription).toContain(firstImage.tag);
    });

    it('should show the plural title and image count when deleting more than one image', () => {
      wrapper.setData({ selectedItems: [1, 2] });
      wrapper.vm.deleteMultipleItems();

      expect(wrapper.vm.modalAction).toBe('Remove tags');
      expect(wrapper.vm.modalDescription).toContain('<b>2</b> tags');
    });
  });

  describe('disabled delete', () => {
    beforeEach(() => {
      store = new Vuex.Store({
        state: {
          isDeleteDisabled: true,
        },
        getters,
      });
      wrapper = mountWithStore({
        propsData: {
          repo: repoPropsData,
          canDeleteRepo: false,
        },
      });
    });

    it('should not render select all', () => {
      const selectAll = findSelectAllCheckbox(wrapper);
      expect(selectAll.exists()).toBe(false);
    });

    it('should not render any select checkbox', () => {
      const selects = findSelectCheckboxes(wrapper);
      expect(selects.length).toBe(0);
    });

    it('should not render delete registry button', () => {
      const deleteBtn = findDeleteButton(wrapper);
      expect(deleteBtn.exists()).toBe(false);
    });

    it('should not render delete row button', () => {
      const deleteBtns = findDeleteButtonsRow(wrapper);
      expect(deleteBtns.length).toBe(0);
    });
  });

  describe('event tracking', () => {
    const mockPageName = 'mock_page';

    beforeEach(() => {
      jest.spyOn(Tracking, 'event');
      wrapper.vm.handleSingleDelete = jest.fn();
      wrapper.vm.handleMultipleDelete = jest.fn();
      document.body.dataset.page = mockPageName;
    });

    afterEach(() => {
      document.body.dataset.page = null;
    });

    describe('single tag delete', () => {
      beforeEach(() => {
        wrapper.setData({ itemsToBeDeleted: [0] });
      });

      it('send an event when delete button is clicked', () => {
        const deleteBtn = findDeleteButtonsRow();
        deleteBtn.at(0).trigger('click');
        expect(Tracking.event).toHaveBeenCalledWith(mockPageName, 'click_button', {
          label: 'registry_tag_delete',
          property: 'foo',
        });
      });
      it('send an event when cancel is pressed on modal', () => {
        const deleteModal = findDeleteModal();
        deleteModal.vm.$emit('cancel');
        expect(Tracking.event).toHaveBeenCalledWith(mockPageName, 'cancel_delete', {
          label: 'registry_tag_delete',
          property: 'foo',
        });
      });
      it('send an event when confirm is clicked on modal', () => {
        const deleteModal = findDeleteModal();
        deleteModal.vm.$emit('ok');

        expect(Tracking.event).toHaveBeenCalledWith(mockPageName, 'confirm_delete', {
          label: 'registry_tag_delete',
          property: 'foo',
        });
      });
    });
    describe('bulk tag delete', () => {
      beforeEach(() => {
        const items = [0, 1, 2];
        wrapper.setData({ itemsToBeDeleted: items, selectedItems: items });
      });

      it('send an event when delete button is clicked', () => {
        const deleteBtn = findDeleteButton();
        deleteBtn.vm.$emit('click');
        expect(Tracking.event).toHaveBeenCalledWith(mockPageName, 'click_button', {
          label: 'bulk_registry_tag_delete',
          property: 'foo',
        });
      });
      it('send an event when cancel is pressed on modal', () => {
        const deleteModal = findDeleteModal();
        deleteModal.vm.$emit('cancel');
        expect(Tracking.event).toHaveBeenCalledWith(mockPageName, 'cancel_delete', {
          label: 'bulk_registry_tag_delete',
          property: 'foo',
        });
      });
      it('send an event when confirm is clicked on modal', () => {
        const deleteModal = findDeleteModal();
        deleteModal.vm.$emit('ok');

        expect(Tracking.event).toHaveBeenCalledWith(mockPageName, 'confirm_delete', {
          label: 'bulk_registry_tag_delete',
          property: 'foo',
        });
      });
    });
  });
});
