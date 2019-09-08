/**
 * @module GUI
 */

import Controller from './Controller.js';
import BooleanController from './BooleanController.js';
import ColorController from './ColorController.js';
import FunctionController from './FunctionController.js';
import NumberController from './NumberController.js';
import OptionController from './OptionController.js';
import StringController from './StringController.js';

import styles from '../build/lil-gui.css';

let stylesInjected = false;

function inject( cssContent ) {
	const injected = document.createElement( 'style' );
	injected.innerHTML = cssContent;
	// inject as the first (lowest priority) style sheet so you can override
	const before = document.querySelector( 'head link[rel=stylesheet], head style' );
	if ( before ) {
		document.head.insertBefore( injected, before );
	} else {
		document.head.appendChild( injected );
	}
}

/**
 * @typedef GUIOptions
 * @property {GUI} [parent] todoc
 * @property {boolean} [autoPlace=true] Automatically appends the GUI to the page and applies fixed positioning
 * @property {boolean} [injectStyles=true] todoc
 * @property {string} [title='Controls'] todoc
 * @property {number} [width] todoc
 * @property {number} [mobileMaxHeight=200] todoc
 * @property {boolean} [collapses=true] todoc
 */

export default class GUI {

	/**
	 * todoc GUI class description
	 * @param {GUIOptions} [options]
	 */
	constructor( {
		parent,
		autoPlace = parent === undefined,
		injectStyles = autoPlace,
		title = 'Controls',
		width,
		mobileMaxHeight = 200,
		collapses = true
	} = {} ) {

		/**
		 * todoc
		 * @type {GUI}
		 */
		this.parent = parent;

		/**
		 * todoc
		 * @type {GUI}
		 */
		this.root = parent ? parent.root : this;

		/**
		 * todoc
		 * @type {Array}
		 */
		this.children = [];

		/**
		 * todoc
		 * @type {boolean}
		 */
		this._closed = false;

		/**
		 * The outermost container `div`.
		 * @type {HTMLElement}
		 */
		this.domElement = document.createElement( 'div' );
		this.domElement.classList.add( 'lil-gui' );

		/**
		 * todoc
		 * @type {HTMLElement}
		 */
		this.$title = document.createElement( collapses ? 'button' : 'div' );
		this.$title.classList.add( 'title' );

		if ( collapses ) {
			this.domElement.classList.add( 'collapses' );
			this.$title.addEventListener( 'click', () => {
				this.open( this._closed );
			} );
		}

		/**
		 * todoc
		 * @type {HTMLElement}
		 */
		this.$children = document.createElement( 'div' );
		this.$children.classList.add( 'children' );

		this.domElement.appendChild( this.$title );
		this.domElement.appendChild( this.$children );

		if ( this.parent ) {

			this.parent.children.push( this );
			this.parent.$children.appendChild( this.domElement );

		} else {

			this.domElement.classList.add( 'root' );

			if ( width ) {
				this.domElement.style.setProperty( '--width', width + 'px' );
			}

		}

		if ( !stylesInjected && injectStyles ) {
			inject( styles );
			stylesInjected = true;
		}

		if ( autoPlace ) {

			this.domElement.classList.add( 'autoPlace' );

			this._onResize = () => {
				this.domElement.style.setProperty( '--window-height', window.innerHeight + 'px' );
			};

			window.addEventListener( 'resize', this._onResize );
			this._onResize();

			// resizeable mobile
			{
				this.mobileMaxHeight = mobileMaxHeight;

				let prevClientY;

				const onTouchStart = e => {
					if ( e.touches.length > 1 ) return;
					prevClientY = e.touches[ 0 ].clientY;
					window.addEventListener( 'touchmove', onTouchMove, { passive: false } );
					window.addEventListener( 'touchend', onTouchEnd );
				};

				const onTouchMove = e => {
					e.preventDefault();
					const deltaY = e.touches[ 0 ].clientY - prevClientY;
					prevClientY = e.touches[ 0 ].clientY;
					this.mobileMaxHeight -= deltaY;
				};

				const onTouchEnd = () => {
					window.removeEventListener( 'touchmove', onTouchMove );
					window.removeEventListener( 'touchend', onTouchEnd );
				};

				this.$title.addEventListener( 'touchstart', onTouchStart );
			}

			document.body.appendChild( this.domElement );

		}

		this.title = title;

	}

	/**
	 * todoc
	 * @param {object} object todoc
	 * @param {string} property todoc
	 * @param {*} [$1] todoc
	 * @param {number} [max] todoc
	 * @param {number} [step] todoc
	 * @returns {Controller}
	 *
	 * @example
	 * gui.add( { myBoolean: false }, 'myBoolean' );
	 *
	 * @example
	 * gui.add( { myNumber: 0 }, 'myNumber', 0, 100, 1 );
	 *
	 * @example
	 * gui.add( { myOptions: 'small' }, 'myOptions', [ 'big', 'medium', 'small' ] );
	 * gui.add( { myOptions: 0 }, 'myOptions', { Label1: 0, Label2: 1, Label3: 2 } );
	 */
	add( object, property, $1, max, step ) {

		const initialValue = object[ property ];

		if ( initialValue === undefined ) {

			throw new Error( `Property "${property}" of ${object} is undefined.` );

		}

		if ( Array.isArray( $1 ) || Object( $1 ) === $1 ) {

			return new OptionController( this, object, property, $1 );

		} else if ( typeof initialValue == 'boolean' ) {

			return new BooleanController( this, object, property );

		} else if ( typeof initialValue == 'string' ) {

			return new StringController( this, object, property );

		} else if ( typeof initialValue == 'function' ) {

			return new FunctionController( this, object, property );

		} else if ( typeof initialValue == 'number' ) {

			return new NumberController( this, object, property, $1, max, step );

		} else {

			throw new Error( `No suitable controller type for ${initialValue}` );

		}

	}

	/**
	 * todoc
	 * @param {object} object todoc
	 * @param {string} property todoc
	 * @returns {Controller}
	 */
	addColor( object, property ) {
		return new ColorController( this, object, property );
	}

	/**
	 * todoc
	 * @param {string} title todoc
	 * @param {boolean} [collapses=true] todoc
	 * @returns {GUI}
	 */
	addFolder( title, collapses = true ) {
		return new GUI( { parent: this, title, collapses } );
	}

	/**
	 * Opens or closes a GUI or folder.
	 * @param {boolean} [open=true]
	 * @returns {GUI} self
	 * @example
	 * folder.open(); // open
	 * folder.open( false ); // closed
	 * folder.open( folder._closed ); // toggle
	 */
	open( open = true ) {
		this._closed = !open;
		this.domElement.classList.toggle( 'closed', this._closed );
		return this;
	}

	/**
	 * todoc
	 * @returns {GUI} self
	 */
	close() {
		this._closed = true;
		this.domElement.classList.add( 'closed' );
		return this;
	}

	/**
	 * todoc
	 */
	destroy() {

		if ( this.parent ) {
			this.parent.children.splice( this.parent.children.indexOf( this ), 1 );
		}

		if ( this.domElement.parentElement ) {
			this.domElement.parentElement.removeChild( this.domElement );
		}

		Array.from( this.children ).forEach( c => c.destroy() );

		if ( this._onResize ) {
			window.removeEventListener( 'resize', this._onResize );
		}

	}

	/**
	 * todoc
	 * @param {Function} callback todoc
	 * @param {boolean} [recursive=false] todoc
	 */
	forEachController( callback, recursive = false ) {
		this.children.forEach( c => {
			if ( c instanceof Controller ) {
				callback( c );
			} else if ( recursive && c instanceof GUI ) {
				c.forEachController( callback, true );
			}
		} );
	}

	get title() {
		return this._title;
	}

	set title( title ) {
		this._title = title;
		this.$title.innerHTML = title;
	}

	get mobileMaxHeight() {
		return this._mobileMaxHeight;
	}

	set mobileMaxHeight( v ) {
		this._mobileMaxHeight = v;
		this.domElement.style.setProperty( '--mobile-max-height', v + 'px' );
	}

}
