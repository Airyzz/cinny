import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './Tabs.scss';

import Button from '../button/Button';
import ScrollView from '../scroll/ScrollView';

import '../../i18n.jsx'
import { useTranslation } from 'react-i18next';

function TabItem({
  selected, iconSrc,
  onClick, children, disabled,
}) {
  const isSelected = selected ? 'tab-item--selected' : '';

  return (
    <Button
      className={`tab-item ${isSelected}`}
      iconSrc={iconSrc}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

TabItem.defaultProps = {
  selected: false,
  iconSrc: null,
  onClick: null,
  disabled: false,
};

TabItem.propTypes = {
  selected: PropTypes.bool,
  iconSrc: PropTypes.string,
  onClick: PropTypes.func,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
};

function Tabs({ items, defaultSelected, onSelect }) {
  const [selectedItem, setSelectedItem] = useState(items[defaultSelected]);

  const { t } = useTranslation();

  const handleTabSelection = (item, index) => {
    if (selectedItem === item) return;
    setSelectedItem(item);
    onSelect(item, index);
  };

  return (
    <div className="tabs">
      <ScrollView horizontal vertical={false} invisible>
        <div className="tabs__content">
          {items.map((item, index) => (
            <TabItem
              key={item.text}
              selected={selectedItem.text === item.text}
              iconSrc={item.iconSrc}
              disabled={item.disabled}
              onClick={() => handleTabSelection(item, index)}
            >
              {(item.translate != undefined && item.translate) ? t(item.text) : item.text}
            </TabItem>
          ))}
        </div>
      </ScrollView>
    </div>
  );
}

Tabs.defaultProps = {
  defaultSelected: 0,
};

Tabs.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      iconSrc: PropTypes.string,
      text: PropTypes.string,
      disabled: PropTypes.bool,
    }),
  ).isRequired,
  defaultSelected: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
};

export default Tabs;
