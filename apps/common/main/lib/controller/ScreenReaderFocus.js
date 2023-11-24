/*
 * (c) Copyright Ascensio System SIA 2010-2023
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-6 Ernesta Birznieka-Upish
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */
/**
 *  ScreenReaderFocus.js
 *
 *  Created by Julia Svinareva on 22.11.2023
 *  Copyright (c) 2021 Ascensio System SIA. All rights reserved.
 *
 */


if (Common === undefined)
    var Common = {};

if (Common.UI === undefined) {
    Common.UI = {};
}

Common.UI.ScreenReaderFocusManager = new(function() {
    var _needShow = false,
        _focusVisible = false,
        _currentLevel = 0,
        _currentSection = document,
        _currentControls = [],
        _currentItemIndex,
        _isLockedKeyEvents = false,
        _isDocReady = false,
        _isEditDiagram = false,
        _isInternalEditorLoading = true,
        _api;

    var _setCurrentSection = function (btn, section) {
        if (section) {
            _currentSection = section;
            return;
        }
        if (btn === 'esc') {
            if (_currentLevel === 0) {
                _currentSection = document;
            }
            return;
        }
        if (_isEditDiagram) {
            _currentSection = [$(window.parent.document).find('.advanced-settings-dlg:visible')[0], window.document];
        } else if ($('#file-menu-panel').is(':visible')) {
            _currentSection = $('#file-menu-panel');
        } else {
            _currentSection = (btn && btn.closest('.hint-section')) || document;
        }
    };

    var _lockedKeyEvents = function (isLocked) {
        if (_api) {
            _isLockedKeyEvents = isLocked;
            _api.asc_enableKeyEvents(!isLocked);
        }
    };

    var _showFocus = function () {
        console.log('_showFocus');
        if (_currentControls.length === 0 || ($('#file-menu-panel').is(':visible' || _isEditDiagram) && _currentLevel === 1)) {
            _getControls();
            _setFocusInActiveTab();
        }
        console.log(_currentControls[_currentItemIndex]);
        if (_currentControls[_currentItemIndex]) {
            $(_currentControls[_currentItemIndex]).focus();
        }
        if (_currentControls.length > 0) {
            !_isLockedKeyEvents && _lockedKeyEvents(true);
            _focusVisible = true;
        } else {
            _focusVisible = false;
        }
    };

    var _hideFocus = function () {

    };

    var _nextItem = function () {
        _currentItemIndex++;
        if (_currentItemIndex > _currentControls.length - 1) {
            _currentItemIndex = 0;
        }
    };

    var _prevItem = function () {
        _currentItemIndex--;
        if (_currentItemIndex < 0) {
            _currentItemIndex = _currentControls.length - 1;
        }
    };

    var _nextLevel = function(level) {
        _currentControls.length = 0;
        if (level !== undefined) {
            _currentLevel = level;
        } else {
            _currentLevel++;
        }
    };

    var _prevLevel = function() {
        _currentControls.length = 0;
        _currentLevel--;
    };

    var _resetToDefault = function() {
        _currentLevel = ($('#file-menu-panel').is(':visible') || _isEditDiagram) ? 1 : 0;
        _setCurrentSection();
        _currentControls.length = 0;
    };

    var _setFocusInActiveTab = function () {
        var activeTab;
        for (var i=0; i<_currentControls.length; i++) {
            var parent = $(_currentControls[i]).parent();
            if (parent && parent.hasClass('ribtab') && parent.hasClass('active')) {
                activeTab = _currentControls[i];
                break;
            }
        }
        if (activeTab) {
            _currentItemIndex = i;
        }
    };

    var _isItemDisabled = function (item) {
        return (item.hasClass('disabled') || item.parent().hasClass('disabled') || item.attr('disabled'));
    };

    var _getControls = function() {
        _currentControls = [];
        var arr = [];
        if (_.isArray(_currentSection)) {
            _currentSection.forEach(function (section) {
                arr = arr.concat($(section).find('[data-hint=' + (_currentLevel) + ']').toArray());
            });
        } else {
            arr = $(_currentSection).find('[data-hint=' + (_currentLevel) + ']').toArray();
        }
        _currentControls = arr.filter(function (item) {
            return ($(item).is(':visible') && !_isItemDisabled($(item)));
        });
    };

    var _init = function(api) {
        if (Common.Utils.isIE || Common.UI.isMac && Common.Utils.isGecko) // turn off hints on IE and FireFox (shortcut F6 selects link in address bar)
            return;
        _api = api;

        Common.NotificationCenter.on({
            'app:ready': function (mode) {
                _isDocReady = true;
            }
        });
        $(document).on('keyup', function(e) {
            if ((e.keyCode == Common.UI.Keys.ALT || e.keyCode === 91) && _needShow && !(window.SSE && window.SSE.getController('Statusbar').getIsDragDrop())) {
                e.preventDefault();
                if (!_focusVisible) {
                    $('input:focus').blur(); // to change value in inputField
                    _currentLevel = ($('#file-menu-panel').is(':visible') || _isEditDiagram) ? 1 : 0;
                    _setCurrentSection();
                    _showFocus();
                } else {
                    _hideFocus();
                    if (_isLockedKeyEvents) {
                        _isLockedKeyEvents = false;
                        _api.asc_enableKeyEvents(true);
                    }
                }
            } else if (_focusVisible) {
                e.preventDefault();
            }
            _needShow = false;
        });
        $(document).on('keydown', function(e) {
            if (_focusVisible) {
                e.preventDefault();
                if (e.keyCode == Common.UI.Keys.LEFT) {
                    _prevItem();
                } else if (e.keyCode == Common.UI.Keys.RIGHT || e.keyCode == Common.UI.Keys.TAB) {
                    _nextItem();
                }
                _showFocus();
            }
            _needShow = e.keyCode == Common.UI.Keys.ALT && !e.shiftKey && !Common.Utils.ModalWindow.isVisible() && _isDocReady && !(window.PE && $('#pe-preview').is(':visible'));
            if (e.altKey && e.keyCode !== 115 && _isInternalEditorLoading) {
                e.preventDefault();
            }
        });
    };

    return {
        init: _init
    }
})();