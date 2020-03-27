
AFRAME.registerComponent('click-to-shoot', {
    init: function () {
        document.body.addEventListener('mousedown', () => { this.el.emit('shoot'); });
    }
});

AFRAME.registerComponent('hit-handler', {
    schema: {
        id: { type: 'string', default: 1 },
    },

    init: function () {
        var el = this.el;
        var element = this.data;
        var object = document.getElementById(element.id);
        var object_red = object.className;
        el.addEventListener('hit', () => {
            console.log(el);
            object.parentNode.removeChild(object);
        });

        // el.addEventListener('die', () => {
        //     object.parentNode.removeChild(object);
        // });
    }
});
